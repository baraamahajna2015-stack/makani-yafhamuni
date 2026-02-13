 'use client';

import React, { useState } from 'react';

export default function UploadPage() {
  const [age, setAge] = useState<number | ''>('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ activity: string; goal: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!imageFile) {
      setError('Please select an image.');
      return;
    }
    if (age === '' || age <= 0) {
      setError('Please enter a valid age.');
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('age', String(age));

      const res = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error('Request failed');
      }

      const data = await res.json();
      setResult({
        activity: data.activity,
        goal: data.goal,
      });
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f5f5',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 400,
          padding: 24,
          borderRadius: 8,
          background: '#ffffff',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        }}
      >
        <h1 style={{ fontSize: 20, marginBottom: 16 }}>Upload & Analyze</h1>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={{ fontSize: 14 }}>
            Image
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setImageFile(file);
              }}
              style={{ marginTop: 4 }}
            />
          </label>

          <label style={{ fontSize: 14 }}>
            Age
            <input
              type="number"
              min={1}
              value={age}
              onChange={(e) => {
                const value = e.target.value;
                setAge(value === '' ? '' : Number(value));
              }}
              style={{
                marginTop: 4,
                width: '100%',
                padding: '6px 8px',
                borderRadius: 4,
                border: '1px solid '#d0d0d0',
                fontSize: 14,
              }}
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 8,
              padding: '8px 12px',
              borderRadius: 4,
              border: 'none',
              background: loading ? '#888' : '#111827',
              color: '#ffffff',
              fontSize: 14,
              cursor: loading ? 'default' : 'pointer',
            }}
          >
            {loading ? 'Analyzing...' : 'Analyze'}
          </button>
        </form>

        {error && (
          <p style={{ marginTop: 12, color: '#b91c1c', fontSize: 13 }}>
            {error}
          </p>
        )}

        {result && (
          <div
            style={{
              marginTop: 16,
              padding: 12,
              borderRadius: 4,
              background: '#f3f4f6',
              fontSize: 14,
            }}
          >
            <div>
              <strong>Activity:</strong> {result.activity}
            </div>
            <div style={{ marginTop: 4 }}>
              <strong>Goal:</strong> {result.goal}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
