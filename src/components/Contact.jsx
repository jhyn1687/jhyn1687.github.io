import {
  MdEmail as Email
} from "react-icons/md";

function Contact() {
  return (
    <div id="Contact" className="section flex-row">
      <div className="flex-col">
        <h1 className="section-title">Let's chat.</h1>
        <p>I have some wonderful ideas that I haven't even thought of yet.</p>
        <a href="mailto:jhyuan01@gmail.com">
          <div className="flex-col bounce">
          <Email
            className="icon-link"
            style={{ fontSize: "2rem", marginTop: "2rem" }}
          />
          <button className="email-button">
            jhyuan01@gmail.com
          </button>
          </div>
        </a>
      </div>
    </div>
  );
}

export default Contact;