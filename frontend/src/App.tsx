import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
      </Routes>
    </BrowserRouter>
  );
}

// Temporary home page component - will be replaced with proper pages later
function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-primary-600 mb-4">WellTrack</h1>
        <p className="text-gray-600 mb-8">Your personal wellness tracking companion</p>
        <div className="space-x-4">
          <button className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-2 rounded-lg transition-colors">
            Get Started
          </button>
          <button className="bg-secondary-500 hover:bg-secondary-600 text-white px-6 py-2 rounded-lg transition-colors">
            Learn More
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
