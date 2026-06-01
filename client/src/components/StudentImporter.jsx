import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import './StudentImporter.css';

export default function StudentImporter({ teacherId, onClose, onImportComplete }) {
  const [availableStudents, setAvailableStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchAvailableStudents = async () => {
      try {
        const response = await api.get(`/students/by-school/${teacherId}`);
        const data = response.data;

        if (data.success) {
          setAvailableStudents(data.students || []);
        } else {
          setError(data.error || 'Failed to load students');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAvailableStudents();
  }, [teacherId]);

  const toggleStudent = (studentId) => {
    if (selectedStudents.includes(studentId)) {
      setSelectedStudents(selectedStudents.filter(id => id !== studentId));
    } else {
      setSelectedStudents([...selectedStudents, studentId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudents.map(s => s._id));
    }
  };

  const handleImport = async () => {
    if (selectedStudents.length === 0) {
      setError('Please select at least one student');
      return;
    }

    setImporting(true);
    setError('');

    try {
      const response = await api.post(`/students/import/${teacherId}`, { sourceStudentIds: selectedStudents });
      const data = response.data;

      if (!data.success) {
        setError(data.error || 'Failed to import students');
        setImporting(false);
        return;
      }

      onImportComplete({
        imported: data.importedCount,
        total: selectedStudents.length
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  };

  const filteredStudents = availableStudents.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.phone.includes(searchTerm)
  );

  const selectAllChecked = filteredStudents.length > 0 && selectedStudents.length === filteredStudents.length;

  return (
    <div className="student-importer">
      <div className="importer-header">
        <h2>Import Students from Other Teachers</h2>
        <button onClick={onClose} className="close-btn">×</button>
      </div>

      <div className="importer-content">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {error && <div className="error-message">{error}</div>}

        {loading ? (
          <div className="loading">Loading students...</div>
        ) : filteredStudents.length > 0 ? (
          <>
            <div className="select-all">
              <label>
                <input
                  type="checkbox"
                  checked={selectAllChecked}
                  onChange={handleSelectAll}
                />
                <span>
                  Select All ({selectedStudents.length}/{filteredStudents.length})
                </span>
              </label>
            </div>

            <div className="students-list">
              {filteredStudents.map(student => (
                <div key={student._id} className="student-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={selectedStudents.includes(student._id)}
                      onChange={() => toggleStudent(student._id)}
                    />
                    <div className="student-info">
                      <div className="student-name">{student.name}</div>
                      <div className="student-details">
                        {student.phone} • Grade {student.grade}
                      </div>
                    </div>
                  </label>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="no-students">
            <p>No other students found in your school</p>
            <p className="help-text">Students from your teacher colleagues will appear here</p>
          </div>
        )}

        <div className="action-buttons">
          <button
            onClick={handleImport}
            className="import-btn"
            disabled={importing || selectedStudents.length === 0}
          >
            {importing
              ? `Importing ${selectedStudents.length} student${selectedStudents.length !== 1 ? 's' : ''}...`
              : `Import ${selectedStudents.length} Student${selectedStudents.length !== 1 ? 's' : ''}`}
          </button>
          <button
            onClick={onClose}
            className="cancel-btn"
            disabled={importing}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
