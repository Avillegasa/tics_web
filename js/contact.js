/*
  TICS Store - Contact Page Functionality
  
  This module handles:
  - Contact form submission
  - FAQ interactions
  - Form validation
  - Success/error handling
*/

// ================================================
// CONTACT FORM HANDLING
// ================================================

/**
 * Initialize contact page functionality
 */
function initContactPage() {
  console.log('Initializing contact page...');
  
  initContactForm();
  initFAQInteractions();
  initContactMethods();
  
  console.log('Contact page initialized successfully!');
}

/**
 * Initialize contact form
 */
function initContactForm() {
  const contactForm = document.getElementById('contact-form');
  if (!contactForm) return;
  
  contactForm.addEventListener('submit', handleContactFormSubmit);
  
  // Add real-time validation
  initRealTimeValidation(contactForm);
  
  // Add character counter for message field
  initMessageCharacterCounter();
}

/**
 * Handle contact form submission
 * @param {Event} e - Form submit event
 */
async function handleContactFormSubmit(e) {
  e.preventDefault();
  
  const form = e.target;
  
  // Validate form
  if (!TICS.FormValidator.validateForm(form)) {
    TICS.ToastManager.error('Por favor, corrige los errores en el formulario');
    return;
  }
  
  try {
    // Show loading
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    
    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando...';
    
    // Simulate form submission
    await simulateFormSubmission();
    
    // Get form data
    const formData = new FormData(form);
    const contactData = Object.fromEntries(formData);
    
    // Save message for demo purposes
    saveContactMessage(contactData);
    
    // Show success message
    showSuccessMessage();
    
    // Reset form
    form.reset();
    clearFormErrors(form);
    
  } catch (error) {
    console.error('Contact form error:', error);
    TICS.ToastManager.error('Error al enviar el mensaje. Por favor, intenta nuevamente.');
  }
}

/**
 * Simulate form submission delay
 */
function simulateFormSubmission() {
  return new Promise((resolve) => {
    setTimeout(resolve, 1500 + Math.random() * 1000);
  });
}

/**
 * Save contact message to localStorage
 * @param {Object} contactData - Contact form data
 */
function saveContactMessage(contactData) {
  const messages = TICS.StorageManager.load('contact-messages', []);
  
  const message = {
    ...contactData,
    id: TICS.generateId(),
    timestamp: new Date().toISOString(),
    status: 'new'
  };
  
  messages.unshift(message);
  
  // Keep only last 50 messages
  if (messages.length > 50) {
    messages.splice(50);
  }
  
  TICS.StorageManager.save('contact-messages', messages);
}

/**
 * Show success message after form submission
 */
function showSuccessMessage() {
  // Create success message element
  const successMessage = document.createElement('div');
  successMessage.className = 'contact-success-message';
  successMessage.innerHTML = `
    <div class="success-icon">✅</div>
    <h3>¡Mensaje enviado exitosamente!</h3>
    <p>Gracias por contactarnos. Te responderemos dentro de 24 horas.</p>
  `;
  
  // Style the success message
  successMessage.style.cssText = `
    background: var(--accent-color);
    color: white;
    padding: var(--spacing-xl);
    border-radius: var(--border-radius);
    text-align: center;
    margin: var(--spacing-xl) 0;
    animation: slideIn 0.5s ease-out;
  `;
  
  // Add CSS animation
  if (!document.querySelector('#contact-success-animation')) {
    const style = document.createElement('style');
    style.id = 'contact-success-animation';
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateY(-20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }
  
  // Insert before contact form
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.parentNode.insertBefore(successMessage, contactForm);
    
    // Remove message after 5 seconds
    setTimeout(() => {
      successMessage.style.animation = 'slideOut 0.5s ease-out';
      setTimeout(() => {
        if (successMessage.parentNode) {
          successMessage.parentNode.removeChild(successMessage);
        }
      }, 500);
    }, 5000);
  }
  
  // Also show toast
  TICS.ToastManager.success('¡Tu mensaje ha sido enviado exitosamente!');
}

// ================================================
// FORM VALIDATION
// ================================================

/**
 * Initialize real-time validation
 * @param {HTMLFormElement} form - Contact form
 */
function initRealTimeValidation(form) {
  const inputs = form.querySelectorAll('input, textarea, select');
  
  inputs.forEach(input => {
    input.addEventListener('blur', () => {
      validateField(input);
    });
    
    input.addEventListener('input', TICS.debounce(() => {
      if (input.classList.contains('error')) {
        validateField(input);
      }
    }, 300));
  });
}

/**
 * Validate individual form field
 * @param {HTMLElement} field - Form field to validate
 */
function validateField(field) {
  const value = field.value.trim();
  
  // Clear previous errors
  TICS.FormValidator.clearError(field);
  
  // Required field validation
  if (field.hasAttribute('required') && !value) {
    TICS.FormValidator.showError(field, 'Este campo es obligatorio');
    return false;
  }
  
  // Email validation
  if (field.type === 'email' && value && !TICS.FormValidator.isValidEmail(value)) {
    TICS.FormValidator.showError(field, 'Ingresa un email válido');
    return false;
  }
  
  // Phone validation
  if (field.type === 'tel' && value && !TICS.FormValidator.isValidPhone(value)) {
    TICS.FormValidator.showError(field, 'Ingresa un teléfono válido');
    return false;
  }
  
  // Message length validation
  if (field.id === 'contact-message' && value && value.length < 10) {
    TICS.FormValidator.showError(field, 'El mensaje debe tener al menos 10 caracteres');
    return false;
  }
  
  return true;
}

/**
 * Clear form errors
 * @param {HTMLFormElement} form - Form to clear
 */
function clearFormErrors(form) {
  const errorElements = form.querySelectorAll('.error-message');
  errorElements.forEach(error => error.remove());
  
  const errorFields = form.querySelectorAll('.error');
  errorFields.forEach(field => field.classList.remove('error'));
}

// ================================================
// MESSAGE CHARACTER COUNTER
// ================================================

/**
 * Initialize message character counter
 */
function initMessageCharacterCounter() {
  const messageTextarea = document.getElementById('contact-message');
  if (!messageTextarea) return;
  
  // Create character counter
  const counter = document.createElement('div');
  counter.className = 'character-counter';
  counter.style.cssText = `
    text-align: right;
    font-size: var(--font-size-sm);
    color: var(--gray-500);
    margin-top: var(--spacing-xs);
  `;
  
  // Insert after textarea
  messageTextarea.parentNode.insertBefore(counter, messageTextarea.nextSibling);
  
  // Update counter
  const updateCounter = () => {
    const currentLength = messageTextarea.value.length;
    const maxLength = messageTextarea.maxLength || 1000;
    
    counter.textContent = `${currentLength}/${maxLength} caracteres`;
    
    // Change color when approaching limit
    if (currentLength > maxLength * 0.9) {
      counter.style.color = 'var(--warning-color)';
    } else if (currentLength > maxLength * 0.8) {
      counter.style.color = 'var(--info-color)';
    } else {
      counter.style.color = 'var(--gray-500)';
    }
  };
  
  // Initial update
  updateCounter();
  
  // Update on input
  messageTextarea.addEventListener('input', updateCounter);
}

// ================================================
// FAQ INTERACTIONS
// ================================================

/**
 * Initialize FAQ interactions
 */
function initFAQInteractions() {
  const faqQuestions = document.querySelectorAll('.faq-question');
  
  faqQuestions.forEach(question => {
    question.addEventListener('click', () => {
      toggleFAQItem(question);
    });
    
    // Add keyboard support
    question.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleFAQItem(question);
      }
    });
    
    // Make focusable
    question.setAttribute('tabindex', '0');
    question.setAttribute('role', 'button');
    question.setAttribute('aria-expanded', 'false');
  });
}

/**
 * Toggle FAQ item
 * @param {HTMLElement} question - FAQ question element
 */
function toggleFAQItem(question) {
  const faqItem = question.closest('.faq-item');
  const isActive = faqItem.classList.contains('active');
  
  // Close all other FAQ items
  document.querySelectorAll('.faq-item.active').forEach(item => {
    if (item !== faqItem) {
      item.classList.remove('active');
      const q = item.querySelector('.faq-question');
      if (q) q.setAttribute('aria-expanded', 'false');
    }
  });
  
  // Toggle current item
  faqItem.classList.toggle('active', !isActive);
  question.setAttribute('aria-expanded', (!isActive).toString());
  
  // Smooth scroll to question if opening
  if (!isActive) {
    setTimeout(() => {
      question.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }
}

// ================================================
// CONTACT METHODS
// ================================================

/**
 * Initialize contact methods interactions
 */
function initContactMethods() {
  const contactMethods = document.querySelectorAll('.contact-method');
  
  contactMethods.forEach(method => {
    method.addEventListener('click', handleContactMethodClick);
  });
}

/**
 * Handle contact method click
 * @param {Event} e - Click event
 */
function handleContactMethodClick(e) {
  const method = e.currentTarget;
  const methodInfo = method.querySelector('.method-info');
  
  if (!methodInfo) return;
  
  // Get contact information
  const email = methodInfo.textContent.includes('@') ? 
    methodInfo.textContent.match(/[\w\.-]+@[\w\.-]+\.\w+/)?.[0] : null;
  
  const phone = methodInfo.textContent.includes('+') ?
    methodInfo.textContent.match(/\+[\d\s\-]+/)?.[0] : null;
  
  // Handle email
  if (email && method.querySelector('.method-icon').textContent.includes('✉')) {
    const subject = 'Consulta desde TICS Store';
    const body = 'Hola, me gustaría obtener más información sobre...';
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    return;
  }
  
  // Handle phone
  if (phone && method.querySelector('.method-icon').textContent.includes('📞')) {
    window.location.href = `tel:${phone.replace(/\s/g, '')}`;
    return;
  }
  
  // Handle address (copy to clipboard)
  if (method.querySelector('.method-icon').textContent.includes('📍')) {
    const address = methodInfo.querySelector('p')?.textContent || '';
    if (address && navigator.clipboard) {
      navigator.clipboard.writeText(address).then(() => {
        TICS.ToastManager.success('Dirección copiada al portapapeles');
      });
    }
    return;
  }
  
  // For other methods, show info
  TICS.ToastManager.info('Información de contacto disponible arriba');
}

// ================================================
// CONTACT FORM AUTOSAVE
// ================================================

/**
 * Initialize form autosave functionality
 */
function initFormAutosave() {
  const form = document.getElementById('contact-form');
  if (!form) return;
  
  const inputs = form.querySelectorAll('input, textarea, select');
  const AUTOSAVE_KEY = 'contact-form-draft';
  
  // Load saved draft
  loadFormDraft(inputs);
  
  // Save draft on input
  inputs.forEach(input => {
    input.addEventListener('input', TICS.debounce(() => {
      saveFormDraft(form);
    }, 1000));
  });
  
  // Clear draft on successful submission
  form.addEventListener('submit', () => {
    setTimeout(() => {
      TICS.StorageManager.remove(AUTOSAVE_KEY);
    }, 2000);
  });
}

/**
 * Load form draft from storage
 * @param {NodeList} inputs - Form inputs
 */
function loadFormDraft(inputs) {
  const draft = TICS.StorageManager.load('contact-form-draft');
  if (!draft) return;
  
  inputs.forEach(input => {
    if (draft[input.name] && input.value === '') {
      input.value = draft[input.name];
    }
  });
  
  // Show draft loaded message
  if (Object.keys(draft).length > 0) {
    TICS.ToastManager.info('Borrador cargado automáticamente');
  }
}

/**
 * Save form draft to storage
 * @param {HTMLFormElement} form - Form element
 */
function saveFormDraft(form) {
  const formData = new FormData(form);
  const draft = Object.fromEntries(formData);
  
  // Only save if there's meaningful content
  const hasContent = Object.values(draft).some(value => 
    value && value.toString().trim().length > 3
  );
  
  if (hasContent) {
    TICS.StorageManager.save('contact-form-draft', draft);
  }
}

// ================================================
// SOCIAL SHARING
// ================================================

/**
 * Initialize social sharing buttons (if any)
 */
function initSocialSharing() {
  const socialLinks = document.querySelectorAll('.social-link');
  
  socialLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      // For demo purposes, just show a message
      e.preventDefault();
      const platform = getSocialPlatform(link);
      TICS.ToastManager.info(`Compartir en ${platform} - Funcionalidad en desarrollo`);
    });
  });
}

/**
 * Get social platform from link
 * @param {HTMLElement} link - Social link element
 * @returns {string} Platform name
 */
function getSocialPlatform(link) {
  const text = link.textContent || link.innerHTML;
  
  if (text.includes('📘')) return 'Facebook';
  if (text.includes('🐦')) return 'Twitter';
  if (text.includes('📷')) return 'Instagram';
  if (text.includes('💼')) return 'LinkedIn';
  
  return 'Red Social';
}

// ================================================
// ACCESSIBILITY IMPROVEMENTS
// ================================================

/**
 * Initialize accessibility improvements
 */
function initAccessibilityImprovements() {
  // Add focus indicators for form fields
  const formFields = document.querySelectorAll('input, textarea, select, button');
  
  formFields.forEach(field => {
    field.addEventListener('focus', () => {
      field.classList.add('focused');
    });
    
    field.addEventListener('blur', () => {
      field.classList.remove('focused');
    });
  });
  
  // Announce form errors to screen readers
  const form = document.getElementById('contact-form');
  if (form) {
    const announcer = document.createElement('div');
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    announcer.style.cssText = 'position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden;';
    form.appendChild(announcer);
    
    // Update announcer when errors occur
    form.addEventListener('invalid', (e) => {
      setTimeout(() => {
        const errors = form.querySelectorAll('.error-message');
        if (errors.length > 0) {
          announcer.textContent = `Formulario contiene ${errors.length} error${errors.length > 1 ? 'es' : ''}`;
        }
      }, 100);
    }, true);
  }
}

// ================================================
// INITIALIZATION
// ================================================

// Initialize contact page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Check if we're on the contact page
  if (window.location.pathname.includes('contact.html') || 
      document.getElementById('contact-form')) {
    
    initContactPage();
    initFormAutosave();
    initSocialSharing();
    initAccessibilityImprovements();
  }
});