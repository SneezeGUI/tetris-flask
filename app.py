from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS

# Initialize Flask app and enable CORS
app = Flask(__name__)
CORS(app)

# Configure database connection
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///tetris_scores.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)


# Define HighScore model for storing game scores
class HighScore(db.Model):
    id = db.Column(db.Integer, primary_key=True)  # Unique ID for each score
    initials = db.Column(db.String(3), nullable=False)  # Player initials (max 3 chars)
    score = db.Column(db.Integer, nullable=False)  # Player score
    timestamp = db.Column(db.DateTime, default=db.func.current_timestamp())  # Timestamp of the score

    # Convert HighScore object to dictionary for JSON serialization
    def to_dict(self):
        return {
            'id': self.id,
            'initials': self.initials,
            'score': self.score,
            'timestamp': self.timestamp
        }


# Route to render the main Tetris game page
@app.route('/')
def tetris_game():
    return render_template('index.html')


# Route to handle score submission
@app.route('/submit_score', methods=['POST'])
def submit_score():
    data = request.json  # Parse incoming JSON data
    initials = data.get('initials')  # Player initials
    score = data.get('score')  # Player score

    # Validate input
    if not initials or not score:
        return jsonify({'error': 'Invalid input'}), 400

    # Query the top 10 high scores in descending order
    existing_scores = HighScore.query.order_by(HighScore.score.desc()).limit(10).all()

    # Check if the new score qualifies for top 10
    if len(existing_scores) < 10 or score > existing_scores[-1].score:
        # Add new score to the database
        new_score = HighScore(initials=initials, score=score)
        db.session.add(new_score)
        db.session.commit()

        # Re-fetch top 10 scores to include the new score
        updated_scores = HighScore.query.order_by(HighScore.score.desc()).limit(10).all()
        return jsonify([score.to_dict() for score in updated_scores])  # Return updated scores as JSON

    # Return the existing top 10 if the new score doesn't qualify
    return jsonify([score.to_dict() for score in existing_scores])


# Route to fetch the top 10 high scores
@app.route('/get_high_scores', methods=['GET'])
def get_high_scores():
    # Query the top 10 high scores in descending order
    scores = HighScore.query.order_by(HighScore.score.desc()).limit(10).all()
    return jsonify([score.to_dict() for score in scores])  # Return scores as JSON


# Main entry point to create database tables and run the app
if __name__ == '__main__':
    with app.app_context():
        db.create_all()  # Create tables if they don't already exist
    app.run(host='0.0.0.0', port=420, debug=True)  # Start the Flask app
