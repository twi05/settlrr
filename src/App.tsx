import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Provider } from "react-redux";
import CreateGroup from "./pages/CreateGroup";
import GroupPage from "./pages/GroupPage";
import NotFound from "./pages/NotFound";
import { store } from "./store/store";

function App() {
  return (
    <BrowserRouter>
      <Provider store={store}>
        <Routes>
          <Route path="/" element={<CreateGroup />} />
          <Route path="/g/:groupId" element={<GroupPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Provider>
    </BrowserRouter>
  );
}

export default App;
