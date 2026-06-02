import React, { useState } from 'react';
import api from '../api/axios';
import './CreateCustomQuestions.css';

export default function CreateCustomQuestions({ teacherId, onSessionStart, onCancel }) {
  const [topic, setTopic] = useState('');
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  const [language, setLanguage] = useState('English');
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [currentType, setCurrentType] = useState('text');
  const [currentOptions, setCurrentOptions] = useState(['', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addQuestion = () => {
    if (!currentQuestion.trim()) {
      setError('Question cannot be empty');
      return;
    }

    if (currentType === 'multiple_choice') {
      const validOptions = currentOptions.filter(opt => opt.trim());
      if (validOptions.length < 2) {
        setError('Multiple choice questions need at least 2 options');
        return;
      }
    }

    const newQuestion = {
      _id: `q_${Date.now()}`,
      question: currentQuestion,
      type: currentType,
      options: currentType === 'multiple_choice' ? currentOptions.filter(opt => opt.trim()) : [],
      correctAnswer
    };

    setQuestions([...questions, newQuestion]);
    setCurrentQuestion('');
    setCurrentType('text');
    setCurrentOptions(['', '', '']);
    setCorrectAnswer('');
    setError('');
  };

  const removeQuestion = (id) => {
    setQuestions(questions.filter(q => q._id !== id));
  };

  const updateOption = (index, value) => {
    const updated = [...currentOptions];
    updated[index] = value;
    setCurrentOptions(updated);
  };

  const addOption = () => {
    setCurrentOptions([...currentOptions, '']);
  };

  const handleStartSession = async () => {
    if (!topic.trim()) {
      setError('Topic is required');
      return;
    }

    if (questions.length === 0) {
      setError('Add at least one question');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/sessions/custom-questions/start', {
          teacherId,
          topic,
          subject,
          grade,
          language,
          questions
      });

      const data = response.data;

      if (!data.success) {
        setError(data.error || 'Failed to start session');
        setLoading(false);
        return;
      }

      onSessionStart(data.session);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="custom-questions-container">
      <div className="questions-form">
        <h2>Create Custom Questions Session</h2>

        <div className="form-group">
          <label>Topic *</label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., Fractions, Photosynthesis"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., Math, Science"
            />
          </div>
          <div className="form-group">
            <label>Grade</label>
            <input
              type="text"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              placeholder="e.g., 5, 6"
            />
          </div>
          <div className="form-group">
            <label>Language</label>
            <select value={language} onChange={(e) => setLanguage(e.target.value)}>
              <option>English</option>
              <option>Hindi</option>
              <option>Marathi</option>
              <option>Tamil</option>
              <option>Telugu</option>
            </select>
          </div>
        </div>

        <div className="question-editor">
          <h3>Add Questions</h3>

          <div className="form-group">
            <label>Question *</label>
            <textarea
              value={currentQuestion}
              onChange={(e) => setCurrentQuestion(e.target.value)}
              placeholder="Enter your question here..."
              rows="2"
            />
          </div>

          <div className="form-group">
            <label>Question Type</label>
            <select
              value={currentType}
              onChange={(e) => {
                setCurrentType(e.target.value);
                if (e.target.value === 'text') {
                  setCurrentOptions([]);
                }
              }}
            >
              <option value="text">Text/Short Answer</option>
              <option value="multiple_choice">Multiple Choice</option>
            </select>
          </div>

          {currentType === 'multiple_choice' && (
            <div className="options-editor">
              <label>Options *</label>
              {currentOptions.map((option, idx) => (
                <input
                  key={idx}
                  type="text"
                  value={option}
                  onChange={(e) => updateOption(idx, e.target.value)}
                  placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                />
              ))}
              {currentOptions.length < 5 && (
                <button type="button" onClick={addOption} className="add-option-btn">
                  + Add Option
                </button>
              )}

              <div className="form-group">
                <label>Correct Answer (for reference)</label>
                <input
                  type="text"
                  value={correctAnswer}
                  onChange={(e) => setCorrectAnswer(e.target.value)}
                  placeholder="e.g., A"
                />
              </div>
            </div>
          )}

          <button onClick={addQuestion} className="add-question-btn" disabled={loading}>
            Add Question
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="questions-list">
          <h3>Questions Added: {questions.length}</h3>
          {questions.map((q, idx) => (
            <div key={q._id} className="question-item">
              <div className="question-content">
                <strong>Q{idx + 1}: {q.question}</strong>
                <p className="question-type">{q.type === 'multiple_choice' ? 'Multiple Choice' : 'Text'}</p>
                {q.options.length > 0 && (
                  <div className="options-list">
                    {q.options.map((opt, oidx) => (
                      <div key={oidx} className="option-item">
                        {String.fromCharCode(65 + oidx)}. {opt}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => removeQuestion(q._id)}
                className="remove-btn"
                disabled={loading}
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <div className="action-buttons">
          <button
            onClick={handleStartSession}
            className="start-session-btn"
            disabled={loading || questions.length === 0}
          >
            {loading ? 'Starting...' : 'Start QR Session'}
          </button>
          <button
            onClick={onCancel}
            className="cancel-btn"
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
