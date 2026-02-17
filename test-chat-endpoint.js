
async function testChat() {
    console.log('Testing Chat API...');
    try {
        const response = await fetch('http://localhost:3000/api/ai-planner/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: 'I want a honeymoon trip to Kerala for 5 days',
                conversation: []
            })
        });

        console.log('Status:', response.status);
        const text = await response.text();
        console.log('Raw Response:', text);

        try {
            const data = JSON.parse(text);
            console.log('Parsed Response:', JSON.stringify(data, null, 2));
        } catch (e) {
            console.log('Could not parse JSON response');
        }

    } catch (error) {
        console.error('Request failed:', error);
    }
}

testChat();
