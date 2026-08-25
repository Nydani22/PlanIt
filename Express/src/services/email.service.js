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


exports.sendEventReminderEmail = async (userEmail, userName, event) => {
  const startDate = event.fromDate ? new Date(event.fromDate).toLocaleString('hu-HU', { timeZone: 'Europe/Budapest' }) : 'Ismeretlen időpont';
  const endDate = event.toDate ? new Date(event.toDate).toLocaleString('hu-HU', { timeZone: 'Europe/Budapest' }) : '';
  
  const timeString = event.isAllDay ? 'Egész napos esemény' : `${startDate} - ${endDate}`;
  
  let htmlContent = `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; line-height: 1.6;">
      <h2>Kedves ${userName || 'Felhasználó'}!</h2>
      <p>Ezt a levelet azért kapod, mert emlékeztetőt kértél a következő eseményhez:</p>
      
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 12px; margin: 25px 0;">
        <h3 style="margin-top: 0; color: #d97706; font-size: 22px; border-bottom: 2px solid #fde68a; padding-bottom: 10px;">
          ${event.eventName}
        </h3>
        
        <p style="margin: 10px 0;"><strong>⏰ Időpont:</strong> ${timeString}</p>
  `;

  if (event.location) {
    htmlContent += `<p style="margin: 10px 0;"><strong>📍 Helyszín:</strong> ${event.location}</p>`;
  }

  if (event.description) {
    htmlContent += `<p style="margin: 10px 0;"><strong>📝 Leírás:</strong><br><span style="white-space: pre-wrap; color: #475569;">${event.description}</span></p>`;
  }

  htmlContent += `
      </div>  
      <div style="text-align: center; margin-top: 30px;">
        <a href="https://useplanit.hu/home" style="background-color: #fcd34d; color: #78350f; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Naptár megnyitása</a>
      </div>
      
      <p style="margin-top: 30px; font-size: 14px; color: #64748b;">Üdvözlettel,<br/><strong>A useplanit csapata</strong></p>
    </div>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: 'UsePlanIt <noreply@useplanit.hu>', 
      to: [userEmail],
      subject: `⏰ Emlékeztető: ${event.eventName} hamarosan kezdődik!`,
      html: htmlContent,
    });

    if (error) {
      console.error('❌ Hiba az emlékeztető küldésekor:', error);
      return { success: false, error };
    }
    return { success: true, data };
  } catch (error) {
    console.error('❌ Váratlan hiba az emlékeztetőnél:', error);
    return { success: false, error };
  }
};