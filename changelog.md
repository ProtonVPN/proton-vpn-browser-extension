# 1.2.10

- Add a button to go to extension review page

# 1.2.9

- Fix graphic bug in Split-Tunneling screen

# 1.2.8

- Free users can now periodically change server

# 1.2.7

- Make the popup faster to load and display
- Prevent trying to reconnect on browser start if logged out
- Improve bug report and compatibility issues analyze
- Update translations

# 1.2.6

- Persist session when closing the browser even if the "Resume from where you left off" setting is not enabled
- Hold bootstrap requests as soon as the extension is running (prevents leaking IP during the connection step)
- Improve recovery on proxy and network error
- Emit a notification if another extension is altering the VPN settings
- Update translations

# 1.2.5

- Update Syria flag
- Update translations
- Allow Firefox extension to also proxy requests via WebSocket and FTP (Already available on Chromium)

# 1.2.4

- Prevent showing servers that the user is not able to connect to
- Add updated translations

# 1.2.3

- Improve crash reports
- [Fix error message handling](https://github.com/ProtonVPN/proton-vpn-browser-extension/issues/2)

# 1.2.2

- Shorten title to "Proton VPN: Fast & Secure"
- Update default number of servers

# 1.2.1

- Re-ask for permission in Firefox if http is missing (happens if permissions were set in an early version)
- Exclude local network from the tunnel using IP range matching
- Improve search sorting and UX
- Update translations

# 1.2.0

- Fix bug that prompted user/pass form in some case

# 1.1.1

- Optimized API cache handling
- Fix missing name display of "United Kingdom"
- Implement auto crash-report (and opt-out in user settings)

# 1.1.0

- Optimize server list loading
- Auto-connect to Secure Core server only if it matches last server connected
- Auto-fill the support form with the info we already have
- Use VPN tunnel to access all other Proton services (stop excluding self API and Pass)

# 1.0.8

- Update package build to comply with Mozilla review process

# 1.0.7

- Update package build to comply with Mozilla review process

# 1.0.6

- Make auto-connect respect the current setting of Secure Core option

# 1.0.5

- Prevent conflict with Pass extension on login

# 1.0.4

- Reverting release 1.0.3

# 1.0.3

- Improve load balancing
- Fix login issue when both Pass and VPN are active

# 1.0.2

- Add new languages (now translated in English, French, German, Dutch, Italian, Polish, Portuguese, Russian, Spanish, Belarusian, Czech, Hindi, Ukrainian, Turkish, Romanian)
- Fix error "Network is Unreachable" that happened inaccurately
- Return automatically to login screen when session is revoked or expired

# 1.0.1

- Add a toggle to enable/disable notifications
- Fix local network exclusion on Chrome
- Fasten reconnection when service got automatically restarted by the browser

# 1.0.0

- Add Secure Core
- Add Split Tunneling

# 0.1.8

- Fix disconnection bug
- Fix username/pass modal bug

# 0.1.7

- Fix accessibility issues
- Exclude servers in maintenance from quick connect
- Re-connect on last setup when browser closed (+ option toggle)
- Add anonymous telemetry and setting toggle

# 0.1.6

- Fix token refresh (which maintain connection open to the server)

# 0.1.5

- Check user plan on start

# 0.1.4

- Use storage session whenever possible

# 0.1.3

- Accessibility improvements
- Fix persistent error modal
