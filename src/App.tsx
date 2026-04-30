

import { BrowserRouter, Routes, Route } from "react-router-dom";
import './App.css'

function App() {

  return (
<BrowserRouter>
      <Routes>
        <Route path="/" element={<CreateGroup />} />
        <Route path="/g/:groupId" element={<GroupPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
