export default function NotFound() {
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', textAlign: 'center' }}>
      <h1>404 - Not Found</h1>
      <p>The requested resource was not found.</p>
      <p style={{ marginTop: '2rem' }}>
        <a href="/" style={{ color: '#0066cc' }}>Return to home</a>
      </p>
    </div>
  );
}