import { useEffect, useState } from "react";
import {
  MdEmail as Email
} from "react-icons/md";

import { supabase } from "../SupabaseClient";

function Contact() {
  const [quote, setQuote] = useState("");
  useEffect(() => {
    async function getQuote() {
      try {
        let { data, error, status } = await supabase
          .from("random_quote")
          .select("quote")
          .limit(1)
          .single();

        console.log(data);

        if (error && status !== 406) {
          throw error;
        }

        if (data) {
          setQuote(data.quote);
        }
      } catch (error) {
        alert(error.message);
      }
    }
    getQuote()
  }, []);

  return (
    <div id="Contact" className="section flex-row">
      <div className="flex-col">
        <h1 className="section-title">Let's chat!</h1>
        <p>{quote}</p>
        <a href="mailto:jhyuan01@gmail.com" style={{ cursor: "default"}}>
          <div className="flex-col bounce">
          <Email
            className="email-icon"
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