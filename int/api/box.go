package api

import (
	"bytes"
)

// injectHostedByMassaBox injects a "Hosted by Massa" box into the HTML content
func InjectHostedByMassaBox(content []byte) []byte {
	boxHTML := `
		<div style="position: fixed; bottom: 10px; left: 10px; background-color: rgba(0, 0, 0, 0.7); color: white; padding: 5px 10px; border-radius: 5px; z-index: 10000;">
			Hosted on <a href="https://massa.net" target="_blank" style="color: red; text-decoration: underline;">Massa</a>
		</div>
	</body>`

	// Insert the boxHTML before the closing </body> tag
	return bytes.Replace(content, []byte("</body>"), []byte(boxHTML), 1)
}
