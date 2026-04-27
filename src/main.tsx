import './index.css';

const form = document.getElementById('emailForm') as HTMLFormElement;
const statusDiv = document.getElementById('status') as HTMLDivElement;
const submitBtn = document.getElementById('submitBtn') as HTMLButtonElement;

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = new FormData(form);
  const subject = formData.get('subject') as string;
  const body = formData.get('body') as string;
  
  // Reset status
  statusDiv.classList.remove('hidden', 'text-emerald-600', 'text-red-600');
  statusDiv.textContent = 'Sending...';
  submitBtn.disabled = true;
  
  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ subject, body }),
    });
    
    const result = await response.json();
    
    if (response.ok) {
      statusDiv.textContent = 'Email sent successfully!';
      statusDiv.classList.add('text-emerald-600');
      form.reset();
    } else {
      statusDiv.textContent = `Error: ${result.error || 'Failed to send email'}`;
      statusDiv.classList.add('text-red-600');
    }
  } catch (error) {
    console.error('Submission error:', error);
    statusDiv.textContent = 'Network error. Please try again.';
    statusDiv.classList.add('text-red-600');
  } finally {
    submitBtn.disabled = false;
  }
});
