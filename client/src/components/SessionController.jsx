import React, { useState } from 'react';
import api from '../api/axios';
import './SessionController.css';

export default function SessionController({ session, onStatusChange, onRefresh }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showStudentList, setShowStudentList] = useState(false);

  const handleFormStatusChange = async () => {
    const newStatus = session.formStatus === 'open' ? 'closed' : 'open';
    setLoading(true);
    setError('');

    try {
      const response = await api.put(`/sessions/${session._id}/form-status`, { formStatus: newStatus });
      const data = response.data;

      if (!data.success) {
        setError(data.error || 'Failed to update form status');
        setLoading(false);
        return;
      }

      onStatusChange(data.session);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const responsesCount = (session.responses || []).length;
  const studentsCount = session.studentCount || 0;
  const responsePercentage = studentsCount > 0 ? Math.round((responsesCount / studentsCount) * 100) : 0;

  return (
    <div className="session-controller">
      <div className="session-header">
        <div className="session-info">
          <h2>{session.topic}</h2>
          <p className="session-details">
            {session.subject} • Grade {session.grade} • {session.language}
          </p>
        </div>
        <div className="session-status">
          <div className={`status-badge ${session.formStatus}`}>
            Form: {session.formStatus.toUpperCase()}
          </div>
          <div className={`status-badge ${session.status}`}>
            Session: {session.status.toUpperCase()}
          </div>
        </div>
      </div>

      <div className="session-stats">
        <div className="stat-card">
          <div className="stat-value">{responsesCount}</div>
          <div className="stat-label">Responses</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{responsePercentage}%</div>
          <div className="stat-label">Response Rate</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{session.questions.length}</div>
          <div className="stat-label">Questions</div>
        </div>
      </div>

      <div className="session-actions">
        <button
          onClick={handleFormStatusChange}
          className={`action-btn ${session.formStatus === 'open' ? 'close-form' : 'open-form'}`}
          disabled={loading}
        >
          {loading ? 'Updating...' : session.formStatus === 'open' ? 'Close Form' : 'Reopen Form'}
        </button>

        <button
          onClick={() => setShowStudentList(!showStudentList)}
          className="action-btn secondary"
        >
          {showStudentList ? 'Hide' : 'Show'} Responses
        </button>

        <button
          onClick={onRefresh}
          className="action-btn secondary"
        >
          Refresh
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {showStudentList && (
        <div className="responses-list">
          <h3>Student Responses</h3>
          {session.responses && session.responses.length > 0 ? (
            <div className="responses-table">
              <div className="table-header">
                <div className="col-name">Student</div>
                <div className="col-phone">Phone</div>
                <div className="col-answers">Answers</div>
                <div className="col-time">Submitted</div>
              </div>
              {session.responses.map((response, idx) => (
                <div key={idx} className="table-row">
                  <div className="col-name">
                    {typeof response.studentId === 'string'
                      ? `Student ${response.studentId}`
                      : response.studentId?.name}
                  </div>
                  <div className="col-phone">
                    {typeof response.studentId === 'object' && response.studentId?.phone}
                  </div>
                  <div className="col-answers">
                    {response.selectedOptions && response.selectedOptions.length > 0
                      ? response.selectedOptions.join(', ')
                      : response.answers?.join('; ') || 'N/A'}
                  </div>
                  <div className="col-time">
                    {response.submittedAt
                      ? new Date(response.submittedAt).toLocaleTimeString()
                      : '-'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-responses">No responses yet</p>
          )}
        </div>
      )}

      <div className="questions-preview">
        <h3>Questions Preview</h3>
        {session.questions && session.questions.length > 0 ? (
          <div className="questions-list">
            {session.questions.map((q, idx) => (
              <div key={idx} className="question-preview">
                <strong>Q{idx + 1}: {q.question}</strong>
                {q.type === 'multiple_choice' && q.options && (
                  <div className="options-preview">
                    {q.options.map((opt, oidx) => (
                      <div key={oidx} className="option-preview">
                        {String.fromCharCode(65 + oidx)}. {opt}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p>No questions available</p>
        )}
      </div>
    </div>
  );
}
