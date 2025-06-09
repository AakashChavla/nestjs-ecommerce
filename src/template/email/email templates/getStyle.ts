export function getStyledHtml(subject: string, message: string): string {
  return `
    <div style="font-family: Arial, sans-serif; background: #f6f8fa; padding: 40px;">
      <div style="max-width: 500px; margin: auto; background: #fff; border-radius: 10px; box-shadow: 0 2px 8px #e0e0e0; overflow: hidden;">
        <div style="background: linear-gradient(90deg, #007cf0 0%, #00dfd8 100%); padding: 24px 0;">
          <h2 style="color: #fff; text-align: center; margin: 0;">${subject}</h2>
        </div>
        <div style="padding: 32px 24px;">
          <p style="font-size: 18px; color: #333; margin-bottom: 24px;">
            ${message}
          </p>
          <div style="text-align: center; margin-top: 32px;">
            <span style="font-size: 14px; color: #888;">Thank you for using our service!</span>
          </div>
        </div>
      </div>
    </div>
  `;
}