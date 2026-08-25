const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

exports.sendWelcomeEmail = async (userEmail, userName) => {
  try {
    const htmlContent = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; max-width: 600px; margin: 0 auto; line-height: 1.6; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        
        <div style="background-color: #fcd34d; padding: 30px; text-align: center;">
          <h1 style="margin: 0; color: #78350f; font-size: 28px; letter-spacing: -0.5px;">Üdvözlünk a PlanIt-ben!</h1>
        </div>
        
        <div style="padding: 30px; background-color: #ffffff;">
          <h2 style="margin-top: 0; color: #1e293b; font-size: 20px;">Kedves ${userName || 'Felhasználó'}!</h2>
          <p style="color: #475569; font-size: 16px;">Köszönjük, hogy csatlakoztál a <strong>useplanit</strong> közösségéhez! Nagyon örülünk, hogy minket választottál a mindennapjaid megszervezéséhez.</p>
          
          <div style="background-color: #f8fafc; border-left: 4px solid #f59e0b; padding: 15px; margin: 25px 0; border-radius: 0 8px 8px 0;">
            <p style="margin: 0; color: #334155; font-size: 15px;">
              <strong>Tipp:</strong> Próbáld ki a beépített AI asszisztensünket! Csak mondd el neki hangüzenetben a programodat, vagy tölts fel egy meghívót, és ő automatikusan beírja a naptáradba.
            </p>
          </div>
          
          <p style="color: #475569; font-size: 16px;">Kezdd el a tervezést, és fedezd fel az intelligens időpontkeresőt még ma!</p>
          
          <div style="text-align: center; margin: 35px 0 15px 0;">
            <a href="https://useplanit.hu/" style="background-color: #fcd34d; color: #78350f; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">Kezdjük el!</a>
          </div>
        </div>
        
        <div style="background-color: #f1f5f9; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0; font-size: 14px; color: #64748b;">Üdvözlettel,<br/><strong style="color: #475569;">A useplanit csapata</strong></p>
        </div>

      </div>
    `;

    const { data, error } = await resend.emails.send({
      from: 'UsePlanIt <noreply@useplanit.hu>', 
      to: [userEmail],
      subject: 'Sikeres regisztráció a useplanit rendszerében!',
      html: htmlContent,
    });

    if (error) {
      console.error('Hiba az email küldésekor a Resend oldalon:', error);
      return { success: false, error };
    }

    return { success: true, data };

  } catch (error) {
    console.error('Váratlan hiba az email szolgáltatásban:', error);
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
        
        <p style="margin: 10px 0;"><strong>Időpont:</strong> ${timeString}</p>
  `;

  if (event.location) {
    htmlContent += `<p style="margin: 10px 0;"><strong>Helyszín:</strong> ${event.location}</p>`;
  }

  if (event.description) {
    htmlContent += `<p style="margin: 10px 0;"><strong>Leírás:</strong><br><span style="white-space: pre-wrap; color: #475569;">${event.description}</span></p>`;
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
      subject: `Emlékeztető: ${event.eventName} hamarosan kezdődik!`,
      html: htmlContent,
    });

    if (error) {
      console.error('Hiba az emlékeztető küldésekor:', error);
      return { success: false, error };
    }
    return { success: true, data };
  } catch (error) {
    console.error('Váratlan hiba az emlékeztetőnél:', error);
    return { success: false, error };
  }
};