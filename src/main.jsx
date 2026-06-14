import './index.css'; // 💡 核心核心：这行必须存在，用来引爆全局的 Tailwind 样式包！
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);