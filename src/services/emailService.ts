import emailjs from '@emailjs/browser';

const SERVICE_ID = 'service_h3y4bu3';
const TEMPLATE_ID = 'template_knbs3lw';
const PUBLIC_KEY = 'VmaJ2hrnGEYVlmGQn';

export const sendEmail = async (service: 'auth' | 'support' | 'teams' | 'info', templateId: string, params: any) => {
  try {
    const serviceId = 
      service === 'support' ? 'service_h3y4bu3' : 
      service === 'auth' ? 'service_7joia8l' :
      service === 'teams' ? 'service_82x51hh' :
      'service_d6gl2h8';
    
    const response = await emailjs.send(
      serviceId,
      templateId,
      params,
      PUBLIC_KEY
    );
    return response;
  } catch (error) {
    console.error(`Error sending email (${service}):`, error);
    throw error;
  }
};

export const sendOTP = async (toEmail: string, userName: string, otp: string) => {
  try {
    const templateParams = {
      user_name: userName,
      role_header: 'Account Verification',
      role_message: `Your verification code is: ${otp}. Please use this code to verify your email address. This code will expire in 10 minutes.`,
      subject: 'Verification Code for OC-CHAT',
      email: toEmail,
      ticket_no: Math.floor(100000 + Math.random() * 900000).toString(), // Random ticket ID placeholder
    };

    const response = await emailjs.send(
      SERVICE_ID,
      TEMPLATE_ID,
      templateParams,
      PUBLIC_KEY
    );

    return response;
  } catch (error) {
    console.error('Error sending OTP:', error);
    throw error;
  }
};

export const sendSupportEmail = async (params: {
  user_name: string;
  subject: string;
  message: string;
  email: string;
}) => {
  try {
    const response = await emailjs.send(
      SERVICE_ID,
      'template_qwsdu8r',
      {
        ...params,
        role_header: 'Support Request Received',
        ticket_no: `SR-${Date.now()}`,
      },
      PUBLIC_KEY
    );
    return response;
  } catch (error) {
    console.error('Error sending support email:', error);
    throw error;
  }
};
