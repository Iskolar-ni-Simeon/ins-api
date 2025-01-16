fetch("http://localhost:5000/login", {
    method: 'POST',
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify({
        API_KEY: "1c6f1f18817c82f9dc53c98ccb6feb6a95c4947a818e56a1f079d43e7f34bc9fce38e89d71a841b10926fb0855f08f2cd28e84ff3a0e0f971ec2f185e1bd7660b8af06b14714a89a68964eacdb7ef26bdcf11006cd676035c52e85c03ca6e38dc3df7a848bec705f854fee693aaa95a9a4d7e566efd80d1e8e06913da1194bc3",
        signinas: "guest"
    })
}).then(response => {
    if (!response.ok) {
        console.error(`Error :(`);
    }
    return response.json();
}).then(data => {
    console.log(data)
})