// Global variables
let currentSentences = [];
let currentSentenceIndex = 0;
let currentPracticeId = null;
let recognition = null;
let isListening = false;
let currentSentenceId = null;
let currentModelTranslation = null;

// Initialize speech recognition
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    recognition.onresult = function(event) {
        let interim_transcript = '';
        let final_transcript = '';
        for (let i = 0; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                final_transcript += event.results[i][0].transcript;
            } else {
                interim_transcript += event.results[i][0].transcript;
            }
        }
        if (final_transcript) {
            document.getElementById('speechResult').textContent = final_transcript;
            document.getElementById('speechResult').className = 'alert alert-success';
            stopListening();
        } else {
            document.getElementById('speechResult').textContent = interim_transcript;
            document.getElementById('speechResult').className = 'alert alert-info';
        }
    };
    
    recognition.onerror = function(event) {
        console.error('Speech recognition error:', event.error);
        document.getElementById('speechResult').textContent = 'Error: ' + event.error;
        document.getElementById('speechResult').className = 'alert alert-danger';
        stopListening();
    };
    
    recognition.onend = function() {
        stopListening();
    };
}

// On page load, check for script_id and mode in URL and start practice directly if present
function getQueryParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

document.addEventListener('DOMContentLoaded', function() {
    loadScripts().then(() => {
        const scriptId = getQueryParam('script_id');
        const mode = getQueryParam('mode');
        if (scriptId) {
            const select = document.getElementById('practiceScript');
            select.value = scriptId;
            select.dispatchEvent(new Event('change'));
        }
        if (mode) {
            document.getElementById('practiceMode').value = mode;
        }
        // لا تبدأ الممارسة تلقائياً، فقط عبئ القيم
    });
});

// Script Management Functions
async function loadScripts() {
    try {
        const response = await fetch('/api/scripts');
        const scripts = await response.json();
        
        const practiceScriptSelect = document.getElementById('practiceScript');
        
        // Clear existing options
        practiceScriptSelect.innerHTML = '<option value="">Choose a script...</option>';
        
        if (scripts.length === 0) {
            practiceScriptSelect.innerHTML = '<option value="">No scripts available. Create a script first.</option>';
        } else {
            // Add options to practice select
            scripts.forEach(script => {
                const option = document.createElement('option');
                option.value = script.id;
                option.textContent = `${script.title} (${script.sentences_count} sentences)`;
                practiceScriptSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading scripts:', error);
    }
}

// Practice Functions
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
        
        document.getElementById('practiceSetup').classList.add('hidden');
        document.getElementById('practiceInterface').classList.remove('hidden');
        
        showCurrentSentence();
    } catch (error) {
        console.error('Error starting practice:', error);
        alert('Error starting practice. Please try again.');
    }
}

function showCurrentSentence() {
    if (currentSentenceIndex >= currentSentences.length) {
        // Practice completed
        showCompletionMessage();
        return;
    }
    
    const sentence = currentSentences[currentSentenceIndex];
    document.getElementById('originalSentence').textContent = sentence.original_text;
    document.getElementById('userTranslation').value = '';
    
    // Update progress
    updateProgress();
    
    // Show translation practice, hide other sections
    document.getElementById('translationPractice').classList.remove('hidden');
    document.getElementById('translationResults').classList.add('hidden');
    document.getElementById('pronunciationPractice').classList.add('hidden');
    document.getElementById('pronunciationResults').classList.add('hidden');
}

function updateProgress() {
    const progress = ((currentSentenceIndex + 1) / currentSentences.length) * 100;
    const progressText = `Sentence ${currentSentenceIndex + 1} of ${currentSentences.length}`;
    
    document.getElementById('progressFill').style.width = progress + '%';
    document.getElementById('progressText').textContent = progressText;
}

function showCompletionMessage() {
    const practiceInterface = document.getElementById('practiceInterface');
    practiceInterface.innerHTML = `
        <div class="practice-card text-center">
            <div class="mb-4">
                <i class="fas fa-trophy fa-5x text-warning"></i>
            </div>
            <h2 class="mb-4">Congratulations! 🎉</h2>
            <p class="lead mb-4">You have completed all sentences in this practice session.</p>
            <div class="d-grid gap-2 d-md-block">
                <button class="btn btn-primary btn-lg me-md-2" onclick="location.reload()">
                    <i class="fas fa-redo me-2"></i>Start New Practice
                </button>
                <button class="btn btn-outline-secondary btn-lg" onclick="window.location.href='/'">
                    <i class="fas fa-home me-2"></i>Go Home
                </button>
            </div>
        </div>
    `;
}

async function checkTranslation() {
    const userTranslation = document.getElementById('userTranslation').value;
    
    if (!userTranslation.trim()) {
        alert('Please enter your translation');
        return;
    }
    
    const sentence = currentSentences[currentSentenceIndex];
    currentSentenceId = sentence.id;
    
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
        currentModelTranslation = result.model_translation;
        
        // Display results
        document.getElementById('resultOriginal').textContent = result.original_text;
        document.getElementById('resultUserTranslation').textContent = result.user_translation;
        document.getElementById('resultModelTranslation').textContent = result.model_translation || '';
        
        // Show add model translation button if missing
        if (!result.model_translation) {
            document.getElementById('addModelTranslationBtn').classList.remove('hidden');
            document.getElementById('modelTranslationHelp').classList.remove('hidden');
        } else {
            document.getElementById('addModelTranslationBtn').classList.add('hidden');
            document.getElementById('modelTranslationHelp').classList.add('hidden');
        }
        
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

function showModelTranslationInput() {
    document.getElementById('modelTranslationInput').value = '';
    const modal = new bootstrap.Modal(document.getElementById('modelTranslationModal'));
    modal.show();
}

async function saveModelTranslation() {
    const modelTranslation = document.getElementById('modelTranslationInput').value.trim();
    if (!modelTranslation) {
        alert('Please enter the model translation.');
        return;
    }
    try {
        const response = await fetch(`/api/sentence/${currentSentenceId}/model_translation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model_translation: modelTranslation })
        });
        const result = await response.json();
        if (result.success) {
            document.getElementById('resultModelTranslation').textContent = modelTranslation;
            document.getElementById('addModelTranslationBtn').classList.add('hidden');
            document.getElementById('modelTranslationHelp').classList.add('hidden');
            // Hide modal
            bootstrap.Modal.getInstance(document.getElementById('modelTranslationModal')).hide();
            currentModelTranslation = modelTranslation;
        }
    } catch (error) {
        alert('Error saving model translation.');
    }
}

function startPronunciation() {
    const sentence = currentSentences[currentSentenceIndex];
    // Fill the radio button texts
    document.getElementById('modelTranslationText').textContent = sentence.model_translation || '';
    document.getElementById('userTranslationText').textContent = document.getElementById('userTranslation').value || '';
    // Set default selection: user translation if available, else model
    if (document.getElementById('userTranslationText').textContent.trim()) {
        document.getElementById('userTranslationRadio').checked = true;
    } else if (document.getElementById('modelTranslationText').textContent.trim()) {
        document.getElementById('modelTranslationRadio').checked = true;
    } else {
        document.getElementById('userTranslationRadio').checked = false;
        document.getElementById('modelTranslationRadio').checked = false;
    }
    updatePronunciationSentence();
    document.getElementById('speechResult').textContent = 'Click the microphone button and say your translation...';
    document.getElementById('speechResult').className = 'alert alert-warning';
    document.getElementById('translationResults').classList.add('hidden');
    document.getElementById('pronunciationPractice').classList.remove('hidden');
}

function updatePronunciationSentence() {
    const userTranslation = document.getElementById('userTranslation').value;
    const modelTranslation = document.getElementById('modelTranslationText').textContent;
    const selectedTranslation = document.getElementById('userTranslationRadio').checked ? userTranslation : modelTranslation;
    document.getElementById('pronunciationSentence').textContent = selectedTranslation;
}

function toggleSpeechRecognition() {
    if (isListening) {
        stopListening();
    } else {
        startListening();
    }
}

function startListening() {
    if (!recognition) {
        alert('Speech recognition is not supported in your browser');
        return;
    }
    
    isListening = true;
    document.getElementById('micButton').classList.add('listening');
    document.getElementById('micButton').innerHTML = '<i class="fas fa-stop"></i>';
    document.getElementById('speechResult').textContent = 'Listening...';
    document.getElementById('speechResult').className = 'alert alert-warning';
    recognition.start();
}

function stopListening() {
    isListening = false;
    document.getElementById('micButton').classList.remove('listening');
    document.getElementById('micButton').innerHTML = '<i class="fas fa-microphone"></i>';
    if (recognition) {
        recognition.stop();
    }
}

function revealSentenceRealtime() {
    let text = document.getElementById('pronunciationSentence').textContent.trim();
    const revealBox = document.getElementById('revealSentenceBox');
    if (!text) {
        revealBox.textContent = '';
        return;
    }
    const words = text.split(/\s+/);
    revealBox.textContent = '';
    let i = 0;
    function revealNextWord() {
        if (i < words.length) {
            revealBox.textContent += (i > 0 ? ' ' : '') + words[i];
            i++;
            setTimeout(revealNextWord, 350);
        } else {
            setTimeout(() => { revealBox.textContent = text; }, 700);
        }
    }
    revealNextWord();
}

function playAudio() {
    // Read aloud the currently selected sentence in pronunciation practice
    let text = document.getElementById('pronunciationSentence').textContent.trim();
    revealSentenceRealtime();
    if (!text) {
        alert('No sentence to read aloud!');
        return;
    }
    // Read aloud
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        speechSynthesis.speak(utterance);
    } else {
        alert('Text-to-speech is not supported in your browser');
    }
}

async function checkPronunciation() {
    const speechResult = document.getElementById('speechResult').textContent;
    if (speechResult === 'Click the microphone button and say your translation...' || 
        speechResult === 'Listening...' || 
        speechResult.startsWith('Error:')) {
        alert('Please speak your translation first');
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
        if (!response.ok) {
            alert('حدث خطأ أثناء التحقق من النطق: ' + (result.error || 'خطأ غير معروف'));
            return;
        }
        // عرض النتيجة
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
        // مقارنة كلمة بكلمة
        const expectedWords = result.expected_words;
        const actualWords = result.actual_words;
        const matchedSet = new Set(result.matched.map(w => w.toLowerCase()));
        const missedSet = new Set(result.missed.map(w => w.toLowerCase()));
        const extraSet = new Set(result.extra.map(w => w.toLowerCase()));
        // الكلمات المتوقعة
        const expectedDiv = document.getElementById('expectedWords');
        if (expectedDiv) expectedDiv.innerHTML = expectedWords.map(word => {
            if (matchedSet.has(word.toLowerCase())) {
                return `<span class='word-correct'>${word}</span>`;
            } else if (missedSet.has(word.toLowerCase())) {
                return `<span class='word-incorrect'>${word}</span>`;
            } else {
                return `<span>${word}</span>`;
            }
        }).join(' ');
        // الكلمات المنطوقة
        const actualDiv = document.getElementById('actualWords');
        if (actualDiv) actualDiv.innerHTML = actualWords.map(word => {
            if (matchedSet.has(word.toLowerCase())) {
                return `<span class='word-correct'>${word}</span>`;
            } else if (extraSet.has(word.toLowerCase())) {
                return `<span class='word-extra'>${word}</span>`;
            } else {
                return `<span>${word}</span>`;
            }
        }).join(' ');
        document.getElementById('pronResultTranslation').textContent = result.user_translation;
        document.getElementById('pronResultSpeech').textContent = result.pronunciation_text;
        document.getElementById('pronunciationPractice').classList.add('hidden');
        document.getElementById('pronunciationResults').classList.remove('hidden');
    } catch (error) {
        alert('حدث خطأ أثناء التحقق من النطق. ' + error);
    }
}

function showWordComparison(expected, actual) {
    const expectedWords = expected.split(/\s+/);
    const actualWords = actual.split(/\s+/);
    const actualSet = new Set(actualWords.map(w => w.toLowerCase()));
    const expectedSet = new Set(expectedWords.map(w => w.toLowerCase()));

    // الكلمات في expected: أخضر إذا نُطقت، أحمر إذا لم تُنطق
    const expectedHtml = expectedWords.map(word => {
        if (actualSet.has(word.toLowerCase())) {
            return `<span class="word-correct">${word}</span>`; // أخضر
        } else {
            return `<span class="word-incorrect">${word}</span>`; // أحمر
        }
    }).join(' ');

    // الكلمات في actual: أخضر إذا مطابقة، أصفر إذا زائدة
    const actualHtml = actualWords.map(word => {
        if (expectedSet.has(word.toLowerCase())) {
            return `<span class="word-correct">${word}</span>`; // أخضر
        } else {
            return `<span class="word-extra">${word}</span>`; // أصفر
        }
    }).join(' ');

    const expectedDiv = document.getElementById('expectedWords');
    const actualDiv = document.getElementById('actualWords');
    if (expectedDiv) expectedDiv.innerHTML = expectedHtml;
    if (actualDiv) actualDiv.innerHTML = actualHtml;
}

function nextSentence() {
    currentSentenceIndex++;
    showCurrentSentence();
} 