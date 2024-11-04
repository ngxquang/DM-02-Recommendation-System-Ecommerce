from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import pandas as pd
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
import logging
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# Logging configuration
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class RecommendationEngine:
    def __init__(self):
        self.user_item_matrix = None
        self.similarity_matrix = None
        self.last_update = None
        self.update_interval = 3600  # 1 hour

    def get_purchase_history(self):
        """Fetch purchase history from database"""
        query = """
        SELECT 
            o.customer_id,
            od.prod_sample_id AS product_id,
            p.name AS product_name,
            COUNT(*) AS purchase_count,
            MAX(o.createdAt) AS last_purchase_date
        FROM `order` o
        JOIN order_detail od ON o.id = od.order_id
        JOIN product_sample p ON od.prod_sample_id = p.id
        GROUP BY o.customer_id, od.prod_sample_id, p.name
        """
        try:
            return pd.read_sql(query, db.engine)
        except Exception as e:
            logger.error(f"Error fetching purchase history: {e}")
            raise

    def update_matrices(self):
        """Update user-item matrix and similarity matrix"""
        if (self.last_update is None or 
            (datetime.now() - self.last_update).total_seconds() > self.update_interval):
            
            purchase_history = self.get_purchase_history()
            
            # Create user-item matrix
            self.user_item_matrix = pd.pivot_table(
                purchase_history,
                values='purchase_count',
                index='customer_id',
                columns='product_id',
                fill_value=0
            )
            
            # Calculate similarity matrix
            self.similarity_matrix = cosine_similarity(self.user_item_matrix)
            self.last_update = datetime.now()
            
            logger.info("Matrices updated successfully")

    def get_customer_products(self, customer_id):
        query = """
        SELECT DISTINCT od.prod_sample_id AS product_id
        FROM `order` o
        JOIN order_detail od ON o.id = od.order_id
        WHERE o.customer_id = %s
        """
        return pd.read_sql(query, db.engine, params=(customer_id,))

    def get_product_details(self, product_ids):
        """Get product details for recommended products, including prod_line_id"""
        query = f"""
        SELECT ps.id, ps.name, od.current_price AS price, ps.prod_line_id
        FROM product_sample ps
        JOIN order_detail od ON ps.id = od.prod_sample_id
        WHERE ps.id IN ({','.join(['%s'] * len(product_ids))})
        GROUP BY ps.id, od.current_price
        """
        return pd.read_sql(query, db.engine, params=tuple(product_ids))
    
    def get_product_prod_line_id(self, product_id):
        """Get prod_line_id of a specific product"""
        query = """
        SELECT prod_line_id 
        FROM product_sample 
        WHERE id = %s
        """
        try:
            result = pd.read_sql(query, db.engine, params=(product_id,))
            return result['prod_line_id'].iloc[0] if not result.empty else None
        except Exception as e:
            logger.error(f"Error fetching prod_line_id for product {product_id}: {e}")
            return None


    def get_recommendations(self, customer_id: int, n_recommendations: int = 200):
        """Generate product recommendations for a customer based on similar customers and prodLineId"""
        try:
            self.update_matrices()
            
            if customer_id not in self.user_item_matrix.index:
                logger.error(f"Customer ID {customer_id} not found in user-item matrix.")
                return []

            # Get customer index
            customer_index = self.user_item_matrix.index.get_loc(customer_id)
            
            # Increase the number of similar customers considered
            similar_customers = np.argsort(self.similarity_matrix[customer_index])[::-1][1:50]
            
            if not similar_customers.size:
                logger.error("No similar customers found.")
                return []

            # Get products already purchased by the customer
            customer_products = self.get_customer_products(customer_id)
            purchased_products = set(customer_products['product_id'].tolist())

            # Get prod_line_ids of products that the customer has purchased
            query = """
            SELECT DISTINCT ps.prod_line_id
            FROM product_sample ps
            JOIN order_detail od ON ps.id = od.prod_sample_id
            JOIN `order` o ON od.order_id = o.id
            WHERE o.customer_id = %s
            """
            customer_prod_lines = pd.read_sql(query, db.engine, params=(customer_id,))
            prod_line_ids = set(customer_prod_lines['prod_line_id'].tolist())
            
            # Calculate product scores
            product_scores = {}
            for similar_customer_idx in similar_customers:
                similar_customer_id = self.user_item_matrix.index[similar_customer_idx]
                similarity_score = self.similarity_matrix[customer_index][similar_customer_idx]
                
                customer_vector = self.user_item_matrix.iloc[similar_customer_idx]
                for product_id, score in customer_vector.items():
                    # Check if product is not already purchased and has a positive score
                    if product_id not in purchased_products and score > 0:
                        product_prod_line_id = self.get_product_prod_line_id(product_id)
                        # Only consider products in the same or similar prod_line_id
                        if product_prod_line_id in prod_line_ids:
                            if product_id not in product_scores:
                                product_scores[product_id] = 0
                            product_scores[product_id] += similarity_score * score

            # Sort and get top N products
            recommended_products = sorted(
                product_scores.items(),
                key=lambda x: x[1],
                reverse=True
            )[:n_recommendations]

            if not recommended_products:
                logger.error("No recommended products found.")
                return []

            # Get product details
            product_ids = [p[0] for p in recommended_products]
            scores = [p[1] for p in recommended_products]
            product_details = self.get_product_details(product_ids)

            # Combine product details with scores, avoiding duplicates
            recommendations = []
            seen_products = set()
            for i, row in product_details.iterrows():
                product_id = row['id']
                if product_id not in seen_products and i < len(scores):
                    recommendations.append({
                        'product_id': product_id,
                        'name': row['name'],
                        'price': float(row['price']),
                        'prod_line_id': row['prod_line_id'],
                        'score': float(scores[i])
                    })
                    seen_products.add(product_id)

            return recommendations

        except Exception as e:
            logger.error(f"Error generating recommendations: {e}")
            raise


# Initialize recommendation engine
recommendation_engine = RecommendationEngine()

@app.route('/recommendations/<int:customer_id>')
def get_recommendations(customer_id):
    try:
        n_recommendations = request.args.get('n_recommendations', default=20, type=int)
        recommendations = recommendation_engine.get_recommendations(
            customer_id,
            n_recommendations
        )
        return jsonify(recommendations)
    except Exception as e:
        logger.error(f"Error in recommendation API: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/health')
def health_check():
    return jsonify({'status': 'healthy'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)