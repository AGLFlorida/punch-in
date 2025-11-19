import Image from 'next/image';

export default function Home() {
  return (
    <>
      <div className="header">
        <h1 className="title">About</h1>
      </div>
      <div className="content">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', padding: '32px 0' }}>
          <Image 
            src="/logo.png" 
            alt="Punch In Logo" 
            width={128} 
            height={128}
            style={{ borderRadius: '16px' }}
          />
          <div style={{ textAlign: 'center', maxWidth: '500px' }}>
            <p style={{ fontSize: '18px', marginBottom: '16px' }}>
              Welcome to PunchIn. Please select an option from the menu on the left.
            </p>
            <p style={{ marginTop: '32px', marginBottom: '16px' }}>
              If you find this app useful, consider supporting its development:
            </p>
            <a 
              href="https://buymeacoffee.com/aglflorida" 
              target="_blank" 
              rel="noopener noreferrer"
              className="coffee-link"
            >
              ☕ Buy Me a Coffee
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
