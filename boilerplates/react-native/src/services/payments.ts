import RazorpayCheckout from 'react-native-razorpay';

export const initiatePayment = (options: {
  amount: number; // in paise
  description: string;
  userEmail?: string;
  userPhone?: string;
}) => {
  return RazorpayCheckout.open({
    key: process.env.RAZORPAY_KEY_ID!,
    amount: options.amount,
    currency: 'INR',
    name: 'Your App',
    description: options.description,
    prefill: {
      email: options.userEmail,
      contact: options.userPhone,
    },
  });
};
