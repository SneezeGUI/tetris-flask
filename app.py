from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS

app = Flask(__name__)
CORS(app)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///tetris_scores.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)


class HighScore(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    initials = db.Column(db.String(3), nullable=False)
    score = db.Column(db.Integer, nullable=False)
    timestamp = db.Column(db.DateTime, default=db.func.current_timestamp())

    def to_dict(self):
        return {
            'id': self.id,
            'initials': self.initials,
            'score': self.score,
            'timestamp': self.timestamp
        }


@app.route('/')
def tetris_game():
    return render_template('index.html')


@app.route('/submit_score', methods=['POST'])
def submit_score():
    data = request.json
    initials = data.get('initials')
    score = data.get('score')

    if not initials or not score:
        return jsonify({'error': 'Invalid input'}), 400

    # Check if score qualifies for top 10
    existing_scores = HighScore.query.order_by(HighScore.score.desc()).limit(10).all()

    if len(existing_scores) < 10 or score > existing_scores[-1].score:
        new_score = HighScore(initials=initials, score=score)
        db.session.add(new_score)
        db.session.commit()

        # Re-fetch top 10 scores after insertion
        updated_scores = HighScore.query.order_by(HighScore.score.desc()).limit(10).all()
        return jsonify([score.to_dict() for score in updated_scores])

    return jsonify([score.to_dict() for score in existing_scores])


@app.route('/get_high_scores', methods=['GET'])
def get_high_scores():
    scores = HighScore.query.order_by(HighScore.score.desc()).limit(10).all()
    return jsonify([score.to_dict() for score in scores])


if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(host='0.0.0.0', port=420, debug=True)
