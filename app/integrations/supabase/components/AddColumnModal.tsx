'use client';

import { useState } from 'react';

interface AddColumnModalProps {
  isOpen: boolean;
  tableName: string;
  onClose: () => void;
  onAdd: (column: ColumnDefinition) => void;
}

export interface ColumnDefinition {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue: string;
}

const POSTGRES_TYPES = [
  { value: 'text', label: 'text', description: 'Variable-length string' },
  { value: 'varchar(255)', label: 'varchar(255)', description: 'Variable-length string with limit' },
  { value: 'integer', label: 'integer', description: '4-byte signed integer' },
  { value: 'bigint', label: 'bigint', description: '8-byte signed integer' },
  { value: 'smallint', label: 'smallint', description: '2-byte signed integer' },
  { value: 'numeric', label: 'numeric', description: 'Arbitrary precision number' },
  { value: 'real', label: 'real', description: '4-byte floating point' },
  { value: 'double precision', label: 'double precision', description: '8-byte floating point' },
  { value: 'boolean', label: 'boolean', description: 'True or false' },
  { value: 'uuid', label: 'uuid', description: 'Universally unique identifier' },
  { value: 'timestamp', label: 'timestamp', description: 'Date and time (no timezone)' },
  { value: 'timestamptz', label: 'timestamptz', description: 'Date and time with timezone' },
  { value: 'date', label: 'date', description: 'Calendar date (year, month, day)' },
  { value: 'time', label: 'time', description: 'Time of day (no timezone)' },
  { value: 'json', label: 'json', description: 'JSON data' },
  { value: 'jsonb', label: 'jsonb', description: 'Binary JSON data (faster)' },
  { value: 'bytea', label: 'bytea', description: 'Binary data' },
  { value: 'inet', label: 'inet', description: 'IPv4 or IPv6 host address' },
  { value: 'int4[]', label: 'int4[]', description: 'Array of integers' },
  { value: 'text[]', label: 'text[]', description: 'Array of text' },
];

const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" x2="6" y1="6" y2="18"/>
    <line x1="6" x2="18" y1="6" y2="18"/>
  </svg>
);

export default function AddColumnModal({ isOpen, tableName, onClose, onAdd }: AddColumnModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState('text');
  const [nullable, setNullable] = useState(true);
  const [defaultValue, setDefaultValue] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate column name
    if (!name.trim()) {
      setError('Column name is required');
      return;
    }

    // Check for valid identifier (letters, numbers, underscores, starts with letter or underscore)
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name.trim())) {
      setError('Column name must start with a letter or underscore and contain only letters, numbers, and underscores');
      return;
    }

    onAdd({
      name: name.trim(),
      type,
      nullable,
      defaultValue: defaultValue.trim(),
    });

    // Reset form
    setName('');
    setType('text');
    setNullable(true);
    setDefaultValue('');
  };

  const handleClose = () => {
    setName('');
    setType('text');
    setNullable(true);
    setDefaultValue('');
    setError('');
    onClose();
  };

  return (
    <div className="add-column-overlay" onClick={handleClose}>
      <div className="add-column-modal" onClick={(e) => e.stopPropagation()}>
        <div className="add-column-header">
          <h3>Add Column to <span className="table-name-highlight">{tableName}</span></h3>
          <button className="add-column-close" onClick={handleClose}>
            <CloseIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="add-column-form">
          {error && <div className="add-column-error">{error}</div>}

          <div className="add-column-field">
            <label htmlFor="column-name">Column Name</label>
            <input
              id="column-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. created_at"
              autoFocus
            />
          </div>

          <div className="add-column-field">
            <label htmlFor="column-type">Data Type</label>
            <select
              id="column-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              {POSTGRES_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <span className="add-column-type-desc">
              {POSTGRES_TYPES.find((t) => t.value === type)?.description}
            </span>
          </div>

          <div className="add-column-field add-column-checkbox">
            <label>
              <input
                type="checkbox"
                checked={nullable}
                onChange={(e) => setNullable(e.target.checked)}
              />
              <span>Allow NULL values</span>
            </label>
          </div>

          <div className="add-column-field">
            <label htmlFor="column-default">Default Value (optional)</label>
            <input
              id="column-default"
              type="text"
              value={defaultValue}
              onChange={(e) => setDefaultValue(e.target.value)}
              placeholder="e.g. 'active' or 0 or NOW()"
            />
            <span className="add-column-type-desc">
              Use single quotes for strings, no quotes for numbers/functions
            </span>
          </div>

          <div className="add-column-actions">
            <button type="button" className="add-column-cancel" onClick={handleClose}>
              Cancel
            </button>
            <button type="submit" className="add-column-submit">
              Add Column
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
