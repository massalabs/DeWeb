package api

import (
	_ "embed"
	"net/http"

	"github.com/go-openapi/runtime"
	"github.com/go-openapi/runtime/middleware"
	"github.com/massalabs/deweb-server/api/read/models"
	"github.com/massalabs/deweb-server/api/read/restapi/operations"
	config "github.com/massalabs/station/int/config"
	"github.com/massalabs/station/pkg/logger"
)

//go:embed resources/home.zip
var homeZip []byte

// As websites are catched by the subdomain middleware, this handler is only called for the landing page resources.
func getResourceHandler(params operations.GetResourceParams) middleware.Responder {
	return middleware.ResponderFunc(func(w http.ResponseWriter, _ runtime.Producer) {
		localHandler(w, homeZip, params.Resource)
	})
}

// Redirects the user to the index.html page.
func defaultPageHandler(params operations.DefaultPageParams) middleware.Responder {
	return middleware.ResponderFunc(func(w http.ResponseWriter, _ runtime.Producer) {
		logger.Debug("DefaultPageHandler: Redirecting to index.html")
		http.Redirect(w, params.HTTPRequest, "/index.html", http.StatusFound)
	})
}

/*Handle get deweb public infos*/
type dewebInfo struct {
	miscInfo    interface{}
	networkInfo config.NetworkInfos
}

func NewDewebInfo(miscInfo interface{}, networkInfo config.NetworkInfos) operations.GetDeWebInfoHandler {
	return &dewebInfo{miscInfo: miscInfo, networkInfo: networkInfo}
}

func (dI *dewebInfo) Handle(params operations.GetDeWebInfoParams) middleware.Responder {
	return middleware.ResponderFunc(func(w http.ResponseWriter, runtime runtime.Producer) {
		// Add CORS headers
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		operations.NewGetDeWebInfoOK().WithPayload(&models.DeWebInfo{
			App:     "deweb",
			Version: config.Version,
			Misc:    dI.miscInfo,
			Network: &models.DeWebInfoNetwork{
				Network: dI.networkInfo.Network,
				Version: dI.networkInfo.Version,
				ChainID: int64(dI.networkInfo.ChainID),
			},
		}).WriteResponse(w, runtime)
	})
}
