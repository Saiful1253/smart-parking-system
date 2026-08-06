const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    
    // Set up localStorage for admin access
    await context.addInitScript(() => {
        localStorage.setItem('token_admin', 'static-test-token');
        localStorage.setItem('loggedInUser_admin', JSON.stringify({
            name: 'Admin User',
            email: 'admin@smartpark.com',
            role: 'admin'
        }));
    });
    
    const page = await context.newPage();
    
    // Listen for console messages
    page.on('console', msg => {
        console.log('Browser console:', msg.type(), msg.text());
    });
    
    // Listen for page errors
    page.on('pageerror', error => {
        console.log('Page error:', error.message);
    });
    
    try {
        await page.goto('http://localhost:3000/admin.html', { waitUntil: 'networkidle' });
        console.log('Page loaded');
        
        // Wait for the page to be fully loaded
        await page.waitForTimeout(2000);
        
        // Handle PIN gate
        const pinInput = await page.locator('#admin-pin-input').first();
        if (await pinInput.isVisible()) {
            await pinInput.fill('admin123');
            await page.locator('#admin-pin-btn').first().click();
            console.log('PIN entered');
            await page.waitForTimeout(1000);
        }
        
        // Click on Settings in the sidebar
        const settingsLink = await page.locator('text=Settings').first();
        if (await settingsLink.isVisible()) {
            await settingsLink.click();
            console.log('Clicked Settings link');
        } else {
            console.log('Settings link not found');
        }
        
        await page.waitForTimeout(1000);
        
        // Take a screenshot
        await page.screenshot({ path: 'settings-page.png' });
        console.log('Screenshot saved');
        
        // Try to click Save Settings button
        const saveBtn = await page.locator('text=Save Settings').first();
        if (await saveBtn.isVisible()) {
            console.log('Save Settings button found, clicking...');
            await saveBtn.click();
            await page.waitForTimeout(1000);
            console.log('Save Settings button clicked');
        } else {
            console.log('Save Settings button not found');
        }
        
        // Check for toast messages
        const toast = await page.locator('.toast-enter').first();
        if (await toast.isVisible()) {
            const toastText = await toast.textContent();
            console.log('Toast message:', toastText);
        }
        
    } catch (error) {
        console.error('Test error:', error.message);
    }
    
    await browser.close();
})();
