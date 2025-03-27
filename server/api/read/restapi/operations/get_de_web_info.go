// Code generated by go-swagger; DO NOT EDIT.

package operations

// This file was generated by the swagger tool.
// Editing this file might prove futile when you re-run the generate command

import (
	"net/http"

	"github.com/go-openapi/runtime/middleware"
)

// GetDeWebInfoHandlerFunc turns a function with the right signature into a get de web info handler
type GetDeWebInfoHandlerFunc func(GetDeWebInfoParams) middleware.Responder

// Handle executing the request and returning a response
func (fn GetDeWebInfoHandlerFunc) Handle(params GetDeWebInfoParams) middleware.Responder {
	return fn(params)
}

// GetDeWebInfoHandler interface for that can handle valid get de web info params
type GetDeWebInfoHandler interface {
	Handle(GetDeWebInfoParams) middleware.Responder
}

// NewGetDeWebInfo creates a new http.Handler for the get de web info operation
func NewGetDeWebInfo(ctx *middleware.Context, handler GetDeWebInfoHandler) *GetDeWebInfo {
	return &GetDeWebInfo{Context: ctx, Handler: handler}
}

/*
	GetDeWebInfo swagger:route GET /__deweb_info getDeWebInfo

GetDeWebInfo get de web info API
*/
type GetDeWebInfo struct {
	Context *middleware.Context
	Handler GetDeWebInfoHandler
}

func (o *GetDeWebInfo) ServeHTTP(rw http.ResponseWriter, r *http.Request) {
	route, rCtx, _ := o.Context.RouteInfo(r)
	if rCtx != nil {
		*r = *rCtx
	}
	var Params = NewGetDeWebInfoParams()
	if err := o.Context.BindValidRequest(r, route, &Params); err != nil { // bind params
		o.Context.Respond(rw, r, route.Produces, route, err)
		return
	}

	res := o.Handler.Handle(Params) // actually handle the request
	o.Context.Respond(rw, r, route.Produces, route, res)

}
