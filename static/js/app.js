// Global variables
let currentSentences = [];
let currentSentenceIndex = 0;
let currentPracticeId = null;
let recognition = null;

// Initialize speech recognition
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    
    recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript;
        document.getElementById('speechResult').textContent = transcript;
        document.getElementById('speechResult').className = 'alert alert-success';
    };
    
    recognition.onerror = function(event) {
        console.error('Speech recognition error:', event.error);
        document.getElementById('speechResult').textContent = 'Error: ' + event.error;
        document.getElementById('speechResult').className = 'alert alert-danger';
    };
}

// Page load initialization
document.addEventListener('DOMContentLoaded', function() {
    loadScripts();
    loadProgress();
    setupEventListeners();
});

// Event listeners setup
function setupEventListeners() {
    // Script form submission
    document.getElementById('scriptForm').addEventListener('submit', function(e) {
        e.preventDefault();
        createScript();
    });
    
    // Search input
    document.getElementById('searchInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchSentences();
        }
    });
}

// Script Management Functions
function showScriptForm() {
    document.getElementById('script-form').classList.remove('hidden');
    document.getElementById('script-form').scrollIntoView({ behavior: 'smooth' });
}

function hideScriptForm() {
    document.getElementById('script-form').classList.add('hidden');
    document.getElementById('scriptForm').reset();
}

async function createScript() {
    const title = document.getElementById('scriptTitle').value;
    const content = document.getElementById('scriptContent').value;
    
    if (!title || !content) {
        alert('Please fill in both title and content');
        return;
    }
    
    try {
        const response = await fetch('/api/scripts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ title, content })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            alert(`Script created successfully! ${result.sentences_count} sentences added.`);
            if (result.auto_translation) {
                alert(result.auto_translation_message);
            }
            hideScriptForm();
            loadScripts();
        } else {
            alert('Error: ' + result.error);
        }
    } catch (error) {
        console.error('Error creating script:', error);
        alert('Error creating script. Please try again.');
    }
}

async function loadScripts() {
    try {
        const response = await fetch('/api/scripts');
        const scripts = await response.json();
        
        const scriptsList = document.getElementById('scriptsList');
        const practiceScriptSelect = document.getElementById('practiceScript');
        
        // Clear existing options
        practiceScriptSelect.innerHTML = '<option value="">Choose a script...</option>';
        
        if (scripts.length === 0) {
            scriptsList.innerHTML = `
                <div class="col-12 text-center">
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle me-2"></i>
                        No scripts created yet. Create your first script to get started!
                    </div>
                </div>
            `;
        } else {
            scriptsList.innerHTML = scripts.map(script => `
                <div class="col-md-6 col-lg-4 mb-4">
                    <div class="card feature-card h-100">
                        <div class="card-body">
                            <h5 class="card-title">${script.title}</h5>
                            <p class="card-text">
                                <i class="fas fa-sentence me-2"></i>${script.sentences_count} sentences
                            </p>
                            <p class="card-text">
                                <small class="text-muted">
                                    <i class="fas fa-calendar me-2"></i>
                                    Created: ${new Date(script.created_at).toLocaleDateString()}
                                </small>
                            </p>
                        </div>
                        <div class="card-footer">
                            <button class="btn btn-primary btn-sm" onclick="startPracticeWithScript(${script.id})">
                                <i class="fas fa-play me-2"></i>Practice
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');
            
            // Add options to practice select
            scripts.forEach(script => {
                const option = document.createElement('option');
                option.value = script.id;
                option.textContent = script.title;
                practiceScriptSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading scripts:', error);
    }
}

// Practice Functions
function startPracticeWithScript(scriptId) {
    document.getElementById('practiceScript').value = scriptId;
    document.getElementById('practice').scrollIntoView({ behavior: 'smooth' });
}

async function startPractice() {
    const scriptId = document.getElementById('practiceScript').value;
    const mode = document.getElementById('practiceMode').value;
    
    if (!scriptId) {
        alert('Please select a script');
        return;
    }
    
    try {
        const response = await fetch(`/api/scripts/${scriptId}/sentences?mode=${mode}`);
        const sentences = await response.json();
        
        if (sentences.length === 0) {
            alert('No sentences found in this script');
            return;
        }
        
        currentSentences = sentences;
        currentSentenceIndex = 0;
        
        document.getElementById('practiceInterface').classList.remove('hidden');
        document.getElementById('practiceInterface').scrollIntoView({ behavior: 'smooth' });
        
        showCurrentSentence();
    } catch (error) {
        console.error('Error starting practice:', error);
        alert('Error starting practice. Please try again.');
    }
}

function showCurrentSentence() {
    if (currentSentenceIndex >= currentSentences.length) {
        // Practice completed
        alert('Congratulations! You have completed all sentences in this script.');
        document.getElementById('practiceInterface').classList.add('hidden');
        loadProgress();
        return;
    }
    
    const sentence = currentSentences[currentSentenceIndex];
    document.getElementById('originalSentence').textContent = sentence.original_text;
    document.getElementById('userTranslation').value = '';
    
    // Show translation practice, hide other sections
    document.getElementById('translationPractice').classList.remove('hidden');
    document.getElementById('translationResults').classList.add('hidden');
    document.getElementById('pronunciationPractice').classList.add('hidden');
    document.getElementById('pronunciationResults').classList.add('hidden');
}

async function checkTranslation() {
    const userTranslation = document.getElementById('userTranslation').value;
    
    if (!userTranslation.trim()) {
        alert('Please enter your translation');
        return;
    }
    
    const sentence = currentSentences[currentSentenceIndex];
    
    try {
        const response = await fetch('/api/practice/translate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                sentence_id: sentence.id,
                user_translation: userTranslation
            })
        });
        
        const result = await response.json();
        currentPracticeId = result.practice_id;
        
        // Display results
        document.getElementById('resultOriginal').textContent = result.original_text;
        document.getElementById('resultUserTranslation').textContent = result.user_translation;
        
        const scoreElement = document.getElementById('translationScore');
        const score = Math.round(result.similarity_score * 100);
        scoreElement.textContent = score + '%';
        
        if (score >= 80) {
            scoreElement.className = 'score-display score-good';
        } else if (score >= 60) {
            scoreElement.className = 'score-display score-medium';
        } else {
            scoreElement.className = 'score-display score-poor';
        }
        
        // Show AI feedback if available
        if (result.ai_feedback) {
            document.getElementById('feedbackText').textContent = result.ai_feedback;
            document.getElementById('aiFeedback').classList.remove('hidden');
        } else {
            document.getElementById('aiFeedback').classList.add('hidden');
        }
        
        // Show results, hide practice
        document.getElementById('translationPractice').classList.add('hidden');
        document.getElementById('translationResults').classList.remove('hidden');
        
    } catch (error) {
        console.error('Error checking translation:', error);
        alert('Error checking translation. Please try again.');
    }
}

function startPronunciation() {
    const sentence = currentSentences[currentSentenceIndex];
    document.getElementById('pronunciationSentence').textContent = sentence.original_text;
    document.getElementById('speechResult').textContent = 'Click "Start Speaking" and say the sentence...';
    document.getElementById('speechResult').className = 'alert alert-warning';
    
    document.getElementById('translationResults').classList.add('hidden');
    document.getElementById('pronunciationPractice').classList.remove('hidden');
}

function startSpeechRecognition() {
    if (!recognition) {
        alert('Speech recognition is not supported in your browser');
        return;
    }
    
    document.getElementById('speechResult').textContent = 'Listening...';
    document.getElementById('speechResult').className = 'alert alert-info';
    recognition.start();
}

function playAudio() {
    const sentence = currentSentences[currentSentenceIndex];
    
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(sentence.original_text);
        utterance.lang = 'en-US';
        utterance.rate = 0.8;
        speechSynthesis.speak(utterance);
    } else {
        alert('Text-to-speech is not supported in your browser');
    }
}

async function checkPronunciation() {
    const speechResult = document.getElementById('speechResult').textContent;
    
    if (speechResult === 'Click "Start Speaking" and say the sentence...' || 
        speechResult === 'Listening...' || 
        speechResult.startsWith('Error:')) {
        alert('Please speak the sentence first');
        return;
    }
    
    try {
        const response = await fetch('/api/practice/pronunciation', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                practice_id: currentPracticeId,
                pronunciation_text: speechResult
            })
        });
        
        const result = await response.json();
        
        // Display results
        document.getElementById('pronResultOriginal').textContent = result.original_text;
        document.getElementById('pronResultSpeech').textContent = result.pronunciation_text;
        
        const scoreElement = document.getElementById('pronunciationScore');
        const score = Math.round(result.pronunciation_score * 100);
        scoreElement.textContent = score + '%';
        
        if (score >= 80) {
            scoreElement.className = 'score-display score-good';
        } else if (score >= 60) {
            scoreElement.className = 'score-display score-medium';
        } else {
            scoreElement.className = 'score-display score-poor';
        }
        
        document.getElementById('pronunciationPractice').classList.add('hidden');
        document.getElementById('pronunciationResults').classList.remove('hidden');
        
    } catch (error) {
        console.error('Error checking pronunciation:', error);
        alert('Error checking pronunciation. Please try again.');
    }
}

function nextSentence() {
    currentSentenceIndex++;
    showCurrentSentence();
}

// Progress Functions
async function loadProgress() {
    try {
        const response = await fetch('/api/progress');
        const progress = await response.json();
        
        const progressStats = document.getElementById('progressStats');
        progressStats.innerHTML = `
            <div class="col-md-3 mb-4">
                <div class="progress-card text-center">
                    <i class="fas fa-book fa-3x text-primary mb-3"></i>
                    <h4>${progress.total_scripts}</h4>
                    <p class="text-muted">Total Scripts</p>
                </div>
            </div>
            <div class="col-md-3 mb-4">
                <div class="progress-card text-center">
                    <i class="fas fa-sentence fa-3x text-success mb-3"></i>
                    <h4>${progress.total_sentences}</h4>
                    <p class="text-muted">Total Sentences</p>
                </div>
            </div>
            <div class="col-md-3 mb-4">
                <div class="progress-card text-center">
                    <i class="fas fa-chart-line fa-3x text-warning mb-3"></i>
                    <h4>${progress.total_practice_sessions}</h4>
                    <p class="text-muted">Practice Sessions</p>
                </div>
            </div>
            <div class="col-md-3 mb-4">
                <div class="progress-card text-center">
                    <i class="fas fa-star fa-3x text-info mb-3"></i>
                    <h4>${progress.avg_translation_score}%</h4>
                    <p class="text-muted">Avg Translation Score</p>
                </div>
            </div>
        `;
        
        // Add recent sessions if any
        if (progress.recent_sessions.length > 0) {
            const recentSessionsHtml = `
                <div class="col-12 mt-4">
                    <h4>Recent Practice Sessions</h4>
                    <div class="table-responsive">
                        <table class="table table-striped">
                            <thead>
                                <tr>
                                    <th>Sentence</th>
                                    <th>Translation Score</th>
                                    <th>Pronunciation Score</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${progress.recent_sessions.map(session => `
                                    <tr>
                                        <td>${session.sentence_text}</td>
                                        <td>
                                            <span class="badge ${session.translation_score >= 0.8 ? 'bg-success' : session.translation_score >= 0.6 ? 'bg-warning' : 'bg-danger'}">
                                                ${Math.round(session.translation_score * 100)}%
                                            </span>
                                        </td>
                                        <td>
                                            ${session.pronunciation_score ? 
                                                `<span class="badge ${session.pronunciation_score >= 0.8 ? 'bg-success' : session.pronunciation_score >= 0.6 ? 'bg-warning' : 'bg-danger'}">
                                                    ${Math.round(session.pronunciation_score * 100)}%
                                                </span>` : 
                                                '<span class="text-muted">-</span>'
                                            }
                                        </td>
                                        <td>${new Date(session.practice_date).toLocaleDateString()}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
            progressStats.innerHTML += recentSessionsHtml;
        }
        
    } catch (error) {
        console.error('Error loading progress:', error);
    }
}

// Search Functions
async function searchSentences() {
    const query = document.getElementById('searchInput').value.trim();
    
    if (!query) {
        document.getElementById('searchResults').innerHTML = '';
        return;
    }
    
    try {
        const response = await fetch(`/api/sentences/search?q=${encodeURIComponent(query)}`);
        const sentences = await response.json();
        
        const searchResults = document.getElementById('searchResults');
        
        if (sentences.length === 0) {
            searchResults.innerHTML = `
                <div class="col-12 text-center">
                    <div class="alert alert-info">
                        No sentences found matching "${query}"
                    </div>
                </div>
            `;
        } else {
            searchResults.innerHTML = sentences.map(sentence => `
                <div class="col-md-6 mb-3">
                    <div class="card">
                        <div class="card-body">
                            <h6 class="card-title">${sentence.script_title}</h6>
                            <p class="card-text">${sentence.original_text}</p>
                            <small class="text-muted">Sentence ${sentence.order_index + 1}</small>
                        </div>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error searching sentences:', error);
    }
} 