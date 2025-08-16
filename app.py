from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import nltk
import difflib
import os
from dotenv import load_dotenv
import openai
from transformers import MarianMTModel, MarianTokenizer
import torch
import traceback

# Load environment variables
load_dotenv()

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///english_practice.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.secret_key = 'your-secret-key-here'

# Initialize extensions
db = SQLAlchemy(app)
CORS(app)

# Configure OpenAI
if os.getenv('OPENAI_API_KEY'):
    openai.api_key = os.getenv('OPENAI_API_KEY')

# Download NLTK data for sentence tokenization
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt')

# Load Helsinki-NLP model once at startup
helsinki_model_name = 'Helsinki-NLP/opus-mt-ar-en'
helsinki_tokenizer = MarianTokenizer.from_pretrained(helsinki_model_name)
helsinki_model = MarianMTModel.from_pretrained(helsinki_model_name)
helsinki_device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
helsinki_model.to(helsinki_device)

def translate_arabic_to_english_hf(text):
    batch = helsinki_tokenizer([text], return_tensors="pt", padding=True).to(helsinki_device)
    gen = helsinki_model.generate(**batch)
    out = helsinki_tokenizer.batch_decode(gen, skip_special_tokens=True)
    return out[0] if out else ''

def batch_translate_arabic_to_english_hf(texts):
    if not texts:
        return []
    batch = helsinki_tokenizer(texts, return_tensors="pt", padding=True).to(helsinki_device)
    gen = helsinki_model.generate(**batch)
    out = helsinki_tokenizer.batch_decode(gen, skip_special_tokens=True)
    return out

# Database Models
class Script(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    sentences = db.relationship('Sentence', backref='script', lazy=True, cascade='all, delete-orphan')

class Sentence(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    script_id = db.Column(db.Integer, db.ForeignKey('script.id'), nullable=False)
    original_text = db.Column(db.Text, nullable=False)
    order_index = db.Column(db.Integer, nullable=False)
    difficulty = db.Column(db.String(20), default='medium')
    model_translation = db.Column(db.Text, nullable=True)
    practice_sessions = db.relationship('PracticeSession', backref='sentence', lazy=True, cascade='all, delete-orphan')

class PracticeSession(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    sentence_id = db.Column(db.Integer, db.ForeignKey('sentence.id'), nullable=False)
    user_translation = db.Column(db.Text)
    translation_score = db.Column(db.Float)
    pronunciation_text = db.Column(db.Text)
    pronunciation_score = db.Column(db.Float)
    practice_date = db.Column(db.DateTime, default=datetime.utcnow)

# Routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/practice')
def practice_page():
    return render_template('practice.html')

@app.route('/scripts/<int:script_id>/sentences', methods=['GET'])
def view_script_sentences(script_id):
    script = Script.query.get_or_404(script_id)
    sentences = Sentence.query.filter_by(script_id=script_id).order_by(Sentence.order_index).all()
    return render_template('sentences.html', script=script, sentences=sentences)

@app.route('/api/scripts', methods=['POST'])
def create_script():
    data = request.get_json()
    title = data.get('title')
    content = data.get('content')
    
    if not title or not content:
        return jsonify({'error': 'Title and content are required'}), 400
    
    # Create new script
    script = Script(title=title)
    db.session.add(script)
    db.session.flush()  # Get the script ID
    
    # Split content into sentences
    sentences = nltk.sent_tokenize(content)
    
    # Batch translate all sentences
    model_translations = batch_translate_arabic_to_english_hf(sentences)
    
    # Save sentences
    sentence_objs = []
    for i, sentence_text in enumerate(sentences):
        model_translation = model_translations[i] if i < len(model_translations) else ''
        sentence = Sentence(
            script_id=script.id,
            original_text=sentence_text.strip(),
            order_index=i,
            model_translation=model_translation
        )
        db.session.add(sentence)
        sentence_objs.append(sentence)

    auto_translation_done = True # Hugging Face model is used for all translations
    
    db.session.commit()
    
    return jsonify({
        'message': 'Script created successfully',
        'script_id': script.id,
        'sentences_count': len(sentences),
        'auto_translation': auto_translation_done,
        'auto_translation_message': 'All sentences were automatically translated.' if auto_translation_done else ''
    })

@app.route('/api/scripts', methods=['GET'])
def get_scripts():
    scripts = Script.query.all()
    return jsonify([{
        'id': script.id,
        'title': script.title,
        'created_at': script.created_at.isoformat(),
        'sentences_count': len(script.sentences)
    } for script in scripts])

@app.route('/api/scripts/<int:script_id>', methods=['GET'])
def get_script(script_id):
    script = Script.query.get_or_404(script_id)
    return jsonify({
        'id': script.id,
        'title': script.title,
        'content': '\n'.join([s.original_text for s in Script.query.get(script_id).sentences])
    })

@app.route('/api/scripts/<int:script_id>', methods=['PUT'])
def update_script(script_id):
    data = request.get_json()
    script = Script.query.get_or_404(script_id)
    script.title = data.get('title', script.title)
    # Update content: replace all sentences
    if 'content' in data:
        # Remove old sentences
        Sentence.query.filter_by(script_id=script.id).delete()
        db.session.flush()
        # Add new sentences
        sentences = nltk.sent_tokenize(data['content'])
        model_translations = batch_translate_arabic_to_english_hf(sentences)
        for i, sentence_text in enumerate(sentences):
            model_translation = model_translations[i] if i < len(model_translations) else ''
            sentence = Sentence(
                script_id=script.id,
                original_text=sentence_text.strip(),
                order_index=i,
                model_translation=model_translation
            )
            db.session.add(sentence)
    db.session.commit()
    return jsonify({'success': True})

@app.route('/api/scripts/<int:script_id>', methods=['DELETE'])
def delete_script(script_id):
    try:
        script = Script.query.get_or_404(script_id)
        db.session.delete(script)
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/scripts/<int:script_id>/sentences', methods=['GET'])
def get_sentences(script_id):
    mode = request.args.get('mode', 'sequential')
    script = Script.query.get_or_404(script_id)
    
    if mode == 'random':
        sentences = Sentence.query.filter_by(script_id=script_id).order_by(db.func.random()).all()
    else:
        sentences = Sentence.query.filter_by(script_id=script_id).order_by(Sentence.order_index).all()
    
    return jsonify([{
        'id': sentence.id,
        'original_text': sentence.original_text,
        'order_index': sentence.order_index,
        'difficulty': sentence.difficulty,
        'model_translation': sentence.model_translation
    } for sentence in sentences])

@app.route('/api/sentence/<int:sentence_id>/model_translation', methods=['POST'])
def set_model_translation(sentence_id):
    data = request.get_json()
    model_translation = data.get('model_translation')
    sentence = Sentence.query.get_or_404(sentence_id)
    sentence.model_translation = model_translation
    db.session.commit()
    return jsonify({'success': True, 'model_translation': model_translation})

@app.route('/api/practice/translate', methods=['POST'])
def practice_translation():
    data = request.get_json()
    sentence_id = data.get('sentence_id')
    user_translation = data.get('user_translation')
    
    sentence = Sentence.query.get_or_404(sentence_id)
    
    # Calculate similarity score
    similarity = difflib.SequenceMatcher(None, 
                                        (sentence.model_translation or sentence.original_text).lower(), 
                                        user_translation.lower()).ratio()
    
    # Optional OpenAI feedback
    ai_feedback = None
    if os.getenv('OPENAI_API_KEY') and similarity < 0.8 and sentence.model_translation:
        try:
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are an English teacher. Provide brief, helpful feedback on translation errors."},
                    {"role": "user", "content": f"Model: {sentence.model_translation}\nStudent translation: {user_translation}\nProvide brief feedback on any errors."}
                ],
                max_tokens=100
            )
            ai_feedback = response.choices[0].message.content
        except Exception as e:
            ai_feedback = "AI feedback unavailable"
    
    # Save practice session
    practice = PracticeSession(
        sentence_id=sentence_id,
        user_translation=user_translation,
        translation_score=similarity
    )
    db.session.add(practice)
    db.session.commit()
    
    return jsonify({
        'original_text': sentence.original_text,
        'model_translation': sentence.model_translation,
        'user_translation': user_translation,
        'similarity_score': similarity,
        'ai_feedback': ai_feedback,
        'practice_id': practice.id
    })

@app.route('/api/practice/pronunciation', methods=['POST'])
def practice_pronunciation():
    try:
        data = request.get_json()
        practice_id = data.get('practice_id')
        pronunciation_text = data.get('pronunciation_text')
        if not practice_id or not pronunciation_text:
            return jsonify({'error': 'practice_id and pronunciation_text are required'}), 400
        practice = PracticeSession.query.get_or_404(practice_id)
        expected = (practice.user_translation or '').strip()
        actual = (pronunciation_text or '').strip()
        expected_words = expected.split()
        actual_words = actual.split()
        expected_set = set(w.lower() for w in expected_words)
        actual_set = set(w.lower() for w in actual_words)
        matched = [w for w in expected_words if w.lower() in actual_set]
        missed = [w for w in expected_words if w.lower() not in actual_set]
        extra = [w for w in actual_words if w.lower() not in expected_set]
        score = 0.0
        if expected_words:
            score = len(matched) / len(expected_words)
        # Save results
        practice.pronunciation_text = actual
        practice.pronunciation_score = score
        db.session.commit()
        return jsonify({
            'expected_words': expected_words,
            'actual_words': actual_words,
            'matched': matched,
            'missed': missed,
            'extra': extra,
            'pronunciation_score': score,
            'user_translation': expected,
            'pronunciation_text': actual
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/progress', methods=['GET'])
def get_progress():
    # Get overall statistics
    total_scripts = Script.query.count()
    total_sentences = Sentence.query.count()
    total_practice_sessions = PracticeSession.query.count()
    
    # Get recent practice sessions
    recent_sessions = PracticeSession.query.order_by(PracticeSession.practice_date.desc()).limit(10).all()
    
    # Calculate average scores
    avg_translation_score = db.session.query(db.func.avg(PracticeSession.translation_score)).scalar() or 0
    avg_pronunciation_score = db.session.query(db.func.avg(PracticeSession.pronunciation_score)).scalar() or 0
    
    return jsonify({
        'total_scripts': total_scripts,
        'total_sentences': total_sentences,
        'total_practice_sessions': total_practice_sessions,
        'avg_translation_score': round(avg_translation_score, 2),
        'avg_pronunciation_score': round(avg_pronunciation_score, 2),
        'recent_sessions': [{
            'id': session.id,
            'sentence_text': session.sentence.original_text[:50] + '...' if len(session.sentence.original_text) > 50 else session.sentence.original_text,
            'user_translation': session.user_translation[:50] + '...' if len(session.user_translation) > 50 else session.user_translation,
            'translation_score': session.translation_score,
            'pronunciation_score': session.pronunciation_score,
            'practice_date': session.practice_date.isoformat()
        } for session in recent_sessions]
    })

@app.route('/api/sentences/search', methods=['GET'])
def search_sentences():
    query = request.args.get('q', '')
    if not query:
        return jsonify([])
    
    sentences = Sentence.query.filter(Sentence.original_text.contains(query)).limit(20).all()
    return jsonify([{
        'id': sentence.id,
        'original_text': sentence.original_text,
        'script_title': sentence.script.title,
        'order_index': sentence.order_index
    } for sentence in sentences])

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, host='0.0.0.0', port=5000) 