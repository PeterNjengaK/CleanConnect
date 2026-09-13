import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Register from "./pages/Register";
import Login from "./pages/Login";
import CustomerDashboard from "./pages/CustomerDashboard";
import CleanerDashboard from "./pages/CleanerDashboard";
import FindCleaners from "./pages/FindCleaners";
import CleanerDetails from "./pages/CleanerDetails";
import PostJob from "./pages/PostJob";
import AvailableJobs from "./pages/AvailableJobs";
import CleanerJobs from "./pages/CleanerJobs";
import AdminDashboard from "./pages/AdminDashboard";
import CleanerMessages from "./pages/CleanerMessages";
import CleanerReviews from "./pages/CleanerReviews";
import ChangePassword from "./pages/ChangePassword";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />

        <Route
          path="/register"
          element={<Register />}
        />
<Route
  path="/find-cleaners"
  element={<FindCleaners />}
/>
<Route
  path="/customer/post-job"
  element={<PostJob />}
/>
        <Route
          path="/login"
          element={<Login />}
        />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route
          path="/customer/dashboard"
          element={<CustomerDashboard />}
        />

        <Route
          path="/cleaner/dashboard"
          element={<CleanerDashboard />}
        />
        <Route
          path="/cleaner/jobs"
          element={<AvailableJobs />}
        />
        <Route
          path="/cleaner/my-jobs"
          element={<CleanerJobs />}
        />
        <Route
          path="/admin/dashboard"
          element={<AdminDashboard />}
        />
        <Route path="/cleaner/messages" element={<CleanerMessages />} />
        <Route path="/cleaner/reviews" element={<CleanerReviews />} />
        <Route path="/change-password" element={<ChangePassword />} />
<Route
  path="/cleaners/:id"
  element={<CleanerDetails />}
/>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
