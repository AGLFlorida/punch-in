import Image from 'next/image';

export default function Home() {
  return (
    <>
      <div className="header">
        <h1 className="title">About</h1>
      </div>
      <div className="content">
        <div className="about-page">
          <Image 
            src="/logo.png" 
            alt="Punch In Logo" 
            width={128} 
            height={128}
            className="about-logo"
          />
          <div className="about-content">
            <p className="about-welcome">
              Welcome to PunchIn. Please select an option from the menu on the left.
            </p>
            <p className="about-support">
              If you find this app useful, consider supporting its development:
            </p>
            <a 
              href="https://buymeacoffee.com/aglflorida" 
              target="_blank" 
              rel="noopener noreferrer"
              className="coffee-link"
              aria-label="Support AGL Consulting of Florida on Buy Me a Coffee"
            >
              ☕ Buy Me a Coffee
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
