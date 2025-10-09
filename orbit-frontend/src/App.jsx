import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import "./styles/App.css";

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-500 text-white text-3xl font-bold">
      Tailwind CSS is working! 🎨
    </div>
  )
}

export default App
