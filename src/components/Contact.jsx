import { useEffect, useState } from "react";

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
    <section id="Contact" className="section flex-row">
      <div className="flex-col">
        <h1 className="section-title">Let's chat!</h1>
        <p>{quote}</p>
      </div>
    </section>
  );
}

export default Contact;