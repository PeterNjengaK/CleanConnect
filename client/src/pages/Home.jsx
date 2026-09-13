import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../api";
import "../App.css";

/* oxlint-disable react/set-state-in-effect */

const services = [
  { name: "House Cleaning", icon: "🏠", description: "Find cleaners for regular home cleaning and everyday needs." },
  { name: "Deep Cleaning", icon: "✨", description: "Give your home a complete deep clean from top to bottom." },
  { name: "Office Cleaning", icon: "🏢", description: "Keep your workplace clean, organized and professional." },
  { name: "Move-Out Cleaning", icon: "🚚", description: "Get your property ready for its next tenant or owner." }
];

function Home() {
  const navigate = useNavigate();
  const [location, setLocation] = useState("");
  const [service, setService] = useState("");
  const [topCleaners, setTopCleaners] = useState([]);
  const [cleanersLoading, setCleanersLoading] = useState(true);

  const loadTopCleaners = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/cleaners/public`);
      const data = await response.json();
      if (response.ok) setTopCleaners((data.cleaners || []).slice(0, 3));
    } catch {
      // Keep the homepage usable while the API is unavailable.
    } finally {
      setCleanersLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTopCleaners();
    const refresh = setInterval(loadTopCleaners, 30000);
    const refreshOnFocus = () => loadTopCleaners();
    window.addEventListener("focus", refreshOnFocus);
    return () => {
      clearInterval(refresh);
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, [loadTopCleaners]);

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  const findCleaners = (selectedService = service) => {
    const params = new URLSearchParams();
    const [city, state] = location.split(",").map((value) => value.trim());
    if (city) params.set("city", city);
    if (state) params.set("state", state);
    if (selectedService) params.set("service", selectedService);
    navigate(`/find-cleaners${params.size ? `?${params.toString()}` : ""}`);
  };

  const postJob = () => {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (user?.role === "customer") navigate("/customer/post-job");
    else navigate("/login", { state: { from: "/customer/post-job" } });
  };

  return (
    <>
      <nav className="navbar">
        <button className="logo home-logo-button" type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>CleanConnect</button>
        <ul className="nav-links">
          <li><button type="button" onClick={() => findCleaners()}>Find Cleaners</button></li>
          <li><button type="button" onClick={() => scrollTo("how-it-works")}>How It Works</button></li>
          <li><button type="button" onClick={() => navigate("/register?role=cleaner")}>Become a Cleaner</button></li>
        </ul>
        <div className="nav-buttons">
          <button className="btn-outline" onClick={() => navigate("/login")}>Log In</button>
          <button className="btn-primary" onClick={() => navigate("/register")}>Sign Up</button>
        </div>
      </nav>

      <section className="hero" id="about">
        <div className="hero-content">
          <h1>Find trusted cleaners,<span> right when you need them.</span></h1>
          <p>Connect with reliable local cleaners for homes, offices, move-outs, deep cleaning and more.</p>
          <div className="hero-buttons">
            <button className="hero-btn hero-btn-primary" onClick={() => findCleaners()}>Find a Cleaner</button>
            <button className="hero-btn hero-btn-secondary" onClick={postJob}>Post a Cleaning Job</button>
          </div>
          <form className="search-box" onSubmit={(event) => { event.preventDefault(); findCleaners(); }}>
            <input type="text" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="City or City, State" aria-label="Cleaning location" />
            <select value={service} onChange={(event) => setService(event.target.value)} aria-label="Cleaning service">
              <option value="">Choose a service</option>
              {services.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
            </select>
            <button type="submit">Search</button>
          </form>
        </div>

        <div className="hero-visual">
          <div className="cleaning-card live-cleaners-card">
            <div className="live-card-heading">
              <h3>Top Cleaners Near You</h3>
              <button type="button" onClick={loadTopCleaners} aria-label="Refresh top cleaners">Refresh</button>
            </div>
            {cleanersLoading && <p className="home-cleaners-status">Loading local cleaners...</p>}
            {!cleanersLoading && topCleaners.length === 0 && (
              <div className="home-cleaners-empty"><p>No completed cleaner profiles are available yet.</p><button type="button" onClick={() => navigate("/register?role=cleaner")}>Become the first</button></div>
            )}
            {topCleaners.map((cleaner) => (
              <button className="cleaner-preview cleaner-preview-button" type="button" key={cleaner._id} onClick={() => navigate(`/cleaners/${cleaner._id}`)}>
                <strong>{cleaner.businessName}</strong>
                <div className="rating">★★★★★ {cleaner.rating > 0 ? cleaner.rating.toFixed(1) : "New"}</div>
                <small>{cleaner.services?.slice(0, 2).join(" & ") || `${cleaner.serviceCity}, ${cleaner.serviceState}`}</small>
              </button>
            ))}
            {!cleanersLoading && topCleaners.length > 0 && (
              <button className="browse-all-cleaners" type="button" onClick={() => findCleaners()}>
                Browse all cleaning professionals →
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="section" id="services">
        <div className="section-title"><h2>Cleaning services for every need</h2><p>Choose a service to see matching professionals.</p></div>
        <div className="services-grid">
          {services.map((item) => (
            <button className="service-card service-card-button" type="button" key={item.name} onClick={() => findCleaners(item.name)}>
              <div className="service-icon">{item.icon}</div><h3>{item.name}</h3><p>{item.description}</p><span>View cleaners →</span>
            </button>
          ))}
        </div>
      </section>

      <section className="section" id="how-it-works">
        <div className="section-title"><h2>How CleanConnect works</h2><p>Getting your cleaning job done is simple.</p></div>
        <div className="steps">
          <div className="step"><div className="step-number">1</div><h3>Post your job</h3><p>Tell us what needs cleaning, where it is and when you need it.</p></div>
          <div className="step"><div className="step-number">2</div><h3>Compare cleaners</h3><p>Receive offers and compare ratings, services and prices.</p></div>
          <div className="step"><div className="step-number">3</div><h3>Book & relax</h3><p>Choose your cleaner, schedule the job and let them handle the cleaning.</p></div>
        </div>
        <div className="home-section-action"><button className="btn-primary" onClick={postJob}>Post Your First Job</button></div>
      </section>

      <section className="cta" id="cleaner-pricing">
        <h2>Are you a cleaner?</h2><p>Find new customers, grow your cleaning business and get more jobs.</p>
        <button onClick={() => navigate("/register?role=cleaner")}>Join as a Cleaner</button>
      </section>

      <footer className="footer" id="contact">
        <div className="footer-grid">
          <div><h3>CleanConnect</h3><p>Connecting customers with trusted cleaning professionals in their local area.</p></div>
          <div><h3>For Customers</h3><ul><li><button onClick={() => findCleaners()}>Find a Cleaner</button></li><li><button onClick={postJob}>Post a Job</button></li><li><button onClick={() => scrollTo("how-it-works")}>How It Works</button></li></ul></div>
          <div><h3>For Cleaners</h3><ul><li><button onClick={() => navigate("/register?role=cleaner")}>Become a Cleaner</button></li><li><button onClick={() => navigate("/login", { state: { from: "/cleaner/jobs" } })}>Find Jobs</button></li><li><button onClick={() => scrollTo("cleaner-pricing")}>Get Started</button></li></ul></div>
          <div><h3>Company</h3><ul><li><button onClick={() => scrollTo("about")}>About Us</button></li><li><a href="mailto:support@cleanconnect.local">Contact</a></li><li><button onClick={() => navigate("/register")}>Create Account</button></li></ul></div>
        </div>
        <div className="footer-bottom">© 2026 CleanConnect. All rights reserved.</div>
      </footer>
    </>
  );
}

export default Home;
