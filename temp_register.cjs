const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lodeqleukaoshzarebxu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvZGVxbGV1a2Fvc2h6YXJlYnh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1NjE3NzQsImV4cCI6MjA4MTEzNzc3NH0.ql-JBWcxWRnnQsHoSCuBsodyVP4SuJiCWRTJxkSTNDc';
const supabase = createClient(supabaseUrl, supabaseKey);

async function register() {
    console.log('Attempting to register jsiguenzatorres@gmail.com...');
    try {
        const { data, error } = await supabase.auth.signUp({
            email: 'jsiguenzatorres@gmail.com',
            password: 'Morena6399$',
            options: {
                data: {
                    full_name: 'Juan José Siguenza Torres',
                    role: 'Admin'
                }
            }
        });

        if (error) {
            console.error('Error during signup:', error.message);
            process.exit(1);
        } else {
            console.log('Signup successful for:', data.user.email);
            console.log('User ID:', data.user.id);
            process.exit(0);
        }
    } catch (e) {
        console.error('Execution error:', e);
        process.exit(1);
    }
}

register();
