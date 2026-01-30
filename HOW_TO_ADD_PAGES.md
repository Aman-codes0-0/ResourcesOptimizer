# How to Add a New Page to TeamOptimizer

To add a new feature (e.g., "Calendar" or "Audit Logs") to the dashboard, follow these 4 steps:

## 1. Update the Sidebar (HTML)
Open `public/index.html` and add a new link in the sidebar directly or under a category.
```html
<a href="#new-feature" class="nav-item" data-page="new-feature">
    <span class="material-icons">star</span> <!-- Choose an icon -->
    New Feature
</a>
```

## 2. Create the Logic File (JS)
Create a new file in `public/js/` (e.g., `public/js/new-feature.js`).
Use this template:
```javascript
class NewFeatureManager {
    async render() {
        const container = document.getElementById('pageContent');
        
        // 1. Set the HTML structure
        container.innerHTML = `
            <div class="view-header">
                <h2>New Feature Title</h2>
            </div>
            <div id="feature-content">Loading...</div>
        `;

        // 2. Load data and update UI
        await this.loadData();
    }

    async loadData() {
        // Example API call
        // const response = await authManager.apiRequest('/api/some-endpoint');
        // const data = await response.json();
        
        document.getElementById('feature-content').innerHTML = 'My Content is loaded!';
    }
}

// Expose it globally
window.newFeatureManager = new NewFeatureManager();
```

## 3. Register the Script
Open `public/index.html` and scroll to the bottom. Add your new script **before** `app.js`.
```html
<script src="js/new-feature.js"></script>
<!-- app.js is always last -->
<script src="js/app.js"></script> 
```

## 4. Update the Router
Open `public/js/app.js`.
Find the `handleRoute()` method and add a specific case for your new page hash.

```javascript
switch (hash) {
    // ... existing cases ...
    
    case 'new-feature': // Matches href="#new-feature"
        if (window.newFeatureManager) {
            await window.newFeatureManager.render();
        }
        break;
        
    // ...
}
```

That's it! When you click the link in the sidebar, `app.js` will detect the URL change and tell your `NewFeatureManager` to render its content into the main page area.
