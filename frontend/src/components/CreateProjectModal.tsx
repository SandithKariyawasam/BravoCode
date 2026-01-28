import React, { useState } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string, desc: string, lang: string) => void;
  loading: boolean;
}

const CreateProjectModal = ({ isOpen, onClose, onSubmit, loading }: ModalProps) => {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [lang, setLang] = useState('javascript');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    onSubmit(title, desc, lang);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: '#161B22',
        padding: '2rem',
        borderRadius: '8px',
        border: '1px solid #30363D',
        width: '400px',
        color: '#C9D1D9'
      }}>
        <h2 style={{ marginTop: 0 }}>Create New Project</h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>

          {/* Title Input */}
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>Project Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., My Awesome App"
              style={{
                width: '100%', padding: '10px',
                backgroundColor: '#0D1117', border: '1px solid #30363D',
                color: 'white', borderRadius: '6px'
              }}
            />
          </div>

          {/* Description Input */}
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>Description</label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Short description..."
              style={{
                width: '100%', padding: '10px',
                backgroundColor: '#0D1117', border: '1px solid #30363D',
                color: 'white', borderRadius: '6px',
                resize: 'none', height: '60px'
              }}
            />
          </div>

          {/* Language Selector */}
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>Language</label>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              style={{
                width: '100%', padding: '10px',
                backgroundColor: '#0D1117', border: '1px solid #30363D',
                color: 'white', borderRadius: '6px'
              }}
            >
              <option value="javascript">Javascript</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ flex: 1, padding: '10px', backgroundColor: 'transparent', border: '1px solid #30363D', color: '#C9D1D9', borderRadius: '6px', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{ flex: 1, padding: '10px', backgroundColor: '#238636', border: 'none', color: 'white', borderRadius: '6px', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateProjectModal;