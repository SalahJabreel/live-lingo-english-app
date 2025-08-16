# LiveLingo - English Language Practice App

A comprehensive full-stack web application for English language practice with script management, translation practice, pronunciation training, and progress tracking.

## 🚀 Features

### 🔹 Script Input & Storage
- Create and manage multiple scripts with titles
- Automatic sentence tokenization using NLTK
- SQLite database storage for scripts and sentences
- Easy script organization and retrieval

### 🔹 Translation Practice
- Practice mode with sequential or random sentence order
- Real-time translation comparison using string similarity
- Optional AI-powered feedback using OpenAI GPT
- Visual score display with color-coded results

### 🔹 Pronunciation Practice
- Web Speech API integration for speech recognition
- Text-to-speech for hearing correct pronunciation
- Pronunciation accuracy scoring
- Real-time speech feedback

### 🔹 Progress Tracking
- Comprehensive dashboard with statistics
- Practice session history
- Average scores tracking
- Recent activity monitoring

### 🧪 Bonus Features
- Sentence search and filtering
- Voice autoplay for pronunciation
- Modern, responsive UI with Bootstrap
- Cross-browser compatibility

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Flask (Python)
- **Database**: SQLite with SQLAlchemy ORM
- **Speech Recognition**: Web Speech API
- **Text-to-Speech**: Web Speech Synthesis API
- **AI Feedback**: OpenAI GPT-3.5 (optional)
- **UI Framework**: Bootstrap 5
- **Icons**: Font Awesome

## 📋 Prerequisites

- Python 3.7 or higher
- Modern web browser with speech recognition support
- Optional: OpenAI API key for AI feedback

## 🚀 Installation & Setup

### 1. Clone or Download the Project
```bash
git clone <repository-url>
cd ARENpractice
```

### 2. Install Python Dependencies
```bash
pip install -r requirements.txt
```

### 3. Set Up Environment Variables (Optional)
Create a `.env` file in the project root for OpenAI integration:
```env
OPENAI_API_KEY=your_openai_api_key_here
```

### 4. Run the Application
```bash
python app.py
```

The application will be available at `http://127.0.0.1:5000/`

## 📖 Usage Guide

### Creating Your First Script
1. Click "Create Your First Script" on the homepage
2. Enter a title for your script
3. Paste or type your English text
4. Click "Create Script" - sentences will be automatically split

### Starting a Practice Session
1. Go to the Practice section
2. Select a script from the dropdown
3. Choose practice mode (Sequential or Random)
4. Click "Start Practice"

### Translation Practice
1. Read the original sentence
2. Type your translation in the text area
3. Click "Check Translation" to see your score
4. Review AI feedback if available

### Pronunciation Practice
1. Click "Continue to Pronunciation"
2. Click "Start Speaking" and say the sentence
3. Use "Hear Pronunciation" to listen to the correct version
4. Click "Check Pronunciation" to see your score

### Tracking Progress
- Visit the Progress section to see your statistics
- View recent practice sessions
- Monitor your average scores

### Searching Sentences
- Use the search feature to find specific sentences
- Search across all your scripts

## 🎯 Browser Compatibility

### Speech Recognition Support
- ✅ Chrome/Chromium (recommended)
- ✅ Edge
- ✅ Safari (limited)
- ❌ Firefox (requires additional setup)

### Text-to-Speech Support
- ✅ Chrome/Chromium
- ✅ Edge
- ✅ Firefox
- ✅ Safari

## 🔧 Configuration

### Database
The application uses SQLite by default. The database file (`english_practice.db`) will be created automatically on first run.

### OpenAI Integration
To enable AI feedback:
1. Get an OpenAI API key from [OpenAI Platform](https://platform.openai.com/)
2. Add it to your `.env` file
3. Restart the application

### Customization
- Modify `app.py` to change database settings
- Edit `templates/index.html` for UI changes
- Update `static/js/app.js` for frontend functionality

## 📁 Project Structure

```
ARENpractice/
├── app.py                 # Main Flask application
├── requirements.txt       # Python dependencies
├── README.md             # This file
├── .env                  # Environment variables (create this)
├── templates/
│   └── index.html        # Main HTML template
├── static/
│   └── js/
│       └── app.js        # Frontend JavaScript
└── english_practice.db   # SQLite database (created automatically)
```

## 🐛 Troubleshooting

### Common Issues

**Speech Recognition Not Working**
- Ensure you're using a supported browser (Chrome recommended)
- Check microphone permissions
- Try refreshing the page

**Database Errors**
- Delete `english_practice.db` and restart the application
- Check file permissions in the project directory

**OpenAI API Errors**
- Verify your API key is correct
- Check your OpenAI account balance
- Ensure the `.env` file is in the project root

**Port Already in Use**
- Change the port in `app.py` line: `app.run(debug=True, host='0.0.0.0', port=5000)`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- NLTK for sentence tokenization
- Bootstrap for UI components
- Font Awesome for icons
- OpenAI for AI feedback capabilities
- Web Speech API for speech recognition

## 📞 Support

For issues, questions, or feature requests, please open an issue in the repository or contact the development team.

---

**Happy Learning! 🎓** 