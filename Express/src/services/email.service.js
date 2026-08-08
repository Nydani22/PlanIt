const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

exports.sendWelcomeEmail = async (userEmail, userName) => {
  try {
    const { data, error } = await resend.emails.send({
      from: 'useplanit <noreply@useplanit.hu>', 
      to: [userEmail],
      subject: 'Sikeres regisztráció a useplanit rendszerében! 🎉',
      html: `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
          <h2>Kedves ${userName || 'Felhasználó'}!</h2>
          <p>Köszönjük, hogy regisztráltál a <strong>useplanit</strong> alkalmazásba. Nagyon örülünk, hogy csatlakoztál hozzánk!</p>
          <p>Kezdd el a tervezést és a feladataid rendszerezését még ma.</p>
          <br/>
          <p>Üdvözlettel,<br/><strong>A useplanit csapata</strong></p>
        </div>
      `,
    });

    if (error) {
      console.error('❌ Hiba az email küldésekor a Resend oldalon:', error);
      return { success: false, error };
    }

    console.log('✅ Üdvözlő email sikeresen elküldve! Azonosító:', data.id);
    return { success: true, data };

  } catch (error) {
    console.error('❌ Váratlan hiba az email szolgáltatásban:', error);
    return { success: false, error };
  }
};


exports.sendLoginNotification = async (userEmail, userName) => {
  try {
    // Aktuális magyar pontos idő generálása
    const loginTime = new Date().toLocaleString('hu-HU', { 
        timeZone: 'Europe/Budapest',
        dateStyle: 'full', 
        timeStyle: 'medium' 
    });

    const { data, error } = await resend.emails.send({
      from: 'useplanit Biztonság <noreply@useplanit.hu>',
      to: [userEmail],
      subject: 'Új bejelentkezés észlelve 🔒',
      html: `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eaeaea; padding: 20px; border-radius: 8px;">
          <h2 style="color: #2c3e50; border-bottom: 2px solid #eaeaea; padding-bottom: 10px;">Biztonsági értesítés</h2>
          <p>Kedves ${userName || 'Felhasználó'}!</p>
          <p>Sikeres bejelentkezés történt a <strong>useplanit</strong> fiókodba a következő adatokkal:</p>
          
          <ul style="background-color: #f8f9fa; padding: 15px 15px 15px 35px; border-radius: 5px; list-style-type: square;">
            <li><strong>Időpont:</strong> ${loginTime}</li>
            <li><strong>Érintett fiók:</strong> ${userEmail}</li>
          </ul>

          <p style="font-size: 13px; color: #666; margin-top: 25px;">
            <em>Ha te jelentkeztél be, kérjük hagyd figyelmen kívül ezt az üzenetet. Ha viszont nem te voltál, javasoljuk, hogy azonnal változtasd meg a jelszavadat!</em>
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('❌ Hiba a login email küldésekor:', error);
      return { success: false, error };
    }

    console.log('✅ Login értesítő email sikeresen elküldve! Azonosító:', data.id);
    return { success: true, data };

  } catch (error) {
    console.error('❌ Váratlan hiba a login email szolgáltatásban:', error);
    return { success: false, error };
  }
};