import Sidebar from '@/components/Sidebar';

export default function Home() {
  return (
    <Sidebar>
      <div className="header">
        <h1 className="title">Timer</h1>
      </div>
      <div className="content">
        <p>Welcome to PunchIn. Please select an option from the menu on the left.</p>
      </div>
    </Sidebar>
  );
}
