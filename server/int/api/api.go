package api

import (
	"context"
	"log"
	"net/http"

	"github.com/go-openapi/loads"
	"github.com/massalabs/deweb-server/api/read/restapi"
	"github.com/massalabs/deweb-server/api/read/restapi/operations"
	"github.com/massalabs/deweb-server/int/api/config"
	"github.com/massalabs/deweb-server/pkg/cache"
	mnscache "github.com/massalabs/deweb-server/pkg/mns/cache"
	"github.com/massalabs/station/pkg/logger"
)

type (
	cacheKeyType    string
	mnsCacheKeyType string
)

const (
	cacheKey    cacheKeyType    = "cache"
	mnsCacheKey mnsCacheKeyType = "mnsCache"
)

type API struct {
	Conf      *config.ServerConfig
	APIServer *restapi.Server
	DewebAPI  *operations.DeWebAPI
	Cache     *cache.Cache
	MNSCache  *mnscache.MNSCache
}

func NewAPI(conf *config.ServerConfig) *API {
	logger.Debugf("Initializing API with config: %+v", conf)

	swaggerSpec, err := loads.Analyzed(restapi.SwaggerJSON, "")
	if err != nil {
		log.Fatalln(err)
	}

	dewebAPI := operations.NewDeWebAPI(swaggerSpec)
	server := restapi.NewServer(dewebAPI)

	var cacheInstance *cache.Cache = nil
	// Initialize cache
	if conf.CacheConfig.Enabled {
		cacheInstance, err = cache.NewCache(conf.CacheConfig.DiskCacheDir, conf.CacheConfig.SiteRAMCacheMaxItems, conf.CacheConfig.SiteDiskCacheMaxItems)
		if err != nil {
			log.Fatalln(err)
		}
	}

	var mnsCacheInstance *mnscache.MNSCache = nil
	if conf.CacheConfig.Enabled {
		mnsCacheInstance = mnscache.NewMNSCache(0, int(conf.CacheConfig.SiteRAMCacheMaxItems))
	}

	return &API{
		Conf:      conf,
		APIServer: server,
		DewebAPI:  dewebAPI,
		Cache:     cacheInstance,
		MNSCache:  mnsCacheInstance,
	}
}

// CacheMiddleware injects the cache instance into the request context
func (a *API) CacheMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		logger.Debugf("CacheMiddleware: Injecting cache into context")
		ctx := context.WithValue(r.Context(), cacheKey, a.Cache)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// MNSCacheMiddleware injects the mns cache instance into the request context
func (a *API) MNSCacheMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		logger.Debugf("MNSCacheMiddleware: Injecting mns cache into context")
		ctx := context.WithValue(r.Context(), mnsCacheKey, a.MNSCache)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// createHandler creates the base handler chain with common middleware
func (a *API) createHandler() http.Handler {
	return a.MNSCacheMiddleware(a.CacheMiddleware(SubdomainMiddleware(a.DewebAPI.Serve(nil), a.Conf)))
}

// Start starts the API server.
func (a *API) Start() {
	defer func() {
		if a.Cache != nil {
			a.Cache.Close()
		}

		if err := a.APIServer.Shutdown(); err != nil {
			log.Fatalln(err)
		}
	}()

	a.APIServer.Port = a.Conf.APIPort

	a.configureAPI()

	a.APIServer.ConfigureAPI()

	// Set handler using the createHandler method
	a.APIServer.SetHandler(a.createHandler())

	if err := a.APIServer.Serve(); err != nil {
		log.Fatalln(err)
	}
}

// ConfigureAPI sets up the API handlers and error handling.
func (a *API) configureAPI() {
	a.DewebAPI.ServeError = func(w http.ResponseWriter, r *http.Request, err error) {
		log.Printf("ServeError: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
	}

	a.DewebAPI.GetResourceHandler = operations.GetResourceHandlerFunc(getResourceHandler)
	a.DewebAPI.DefaultPageHandler = operations.DefaultPageHandlerFunc(defaultPageHandler)
	a.DewebAPI.GetDeWebInfoHandler = NewDewebInfo(a.Conf.MiscPublicInfoJson)
}
