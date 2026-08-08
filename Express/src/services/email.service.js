const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

exports.sendWelcomeEmail = async (userEmail, userName) => {
  try {
    const { data, error } = await resend.emails.send({
      from: 'UsePlanIt <noreply@useplanit.hu>', 
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

    return { success: true, data };

  } catch (error) {
    console.error('❌ Váratlan hiba az email szolgáltatásban:', error);
    return { success: false, error };
  }
};