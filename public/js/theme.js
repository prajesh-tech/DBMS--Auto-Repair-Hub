const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);
document.documentElement.classList.toggle('dark', savedTheme === 'dark');
