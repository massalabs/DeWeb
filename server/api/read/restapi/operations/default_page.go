// Code generated by go-swagger; DO NOT EDIT.

package operations

// This file was generated by the swagger tool.
// Editing this file might prove futile when you re-run the generate command

import (
	"net/http"

	"github.com/go-openapi/runtime/middleware"
)

// DefaultPageHandlerFunc turns a function with the right signature into a default page handler
type DefaultPageHandlerFunc func(DefaultPageParams) middleware.Responder

// Handle executing the request and returning a response
func (fn DefaultPageHandlerFunc) Handle(params DefaultPageParams) middleware.Responder {
	return fn(params)
}

// DefaultPageHandler interface for that can handle valid default page params
type DefaultPageHandler interface {
	Handle(DefaultPageParams) middleware.Responder
}

// NewDefaultPage creates a new http.Handler for the default page operation
func NewDefaultPage(ctx *middleware.Context, handler DefaultPageHandler) *DefaultPage {
	return &DefaultPage{Context: ctx, Handler: handler}
}

/*
	DefaultPage swagger:route GET / defaultPage

DefaultPage default page API
*/
type DefaultPage struct {
	Context *middleware.Context
	Handler DefaultPageHandler
}

func (o *DefaultPage) ServeHTTP(rw http.ResponseWriter, r *http.Request) {
	route, rCtx, _ := o.Context.RouteInfo(r)
	if rCtx != nil {
		*r = *rCtx
	}
	var Params = NewDefaultPageParams()
	if err := o.Context.BindValidRequest(r, route, &Params); err != nil { // bind params
		o.Context.Respond(rw, r, route.Produces, route, err)
		return
	}

	res := o.Handler.Handle(Params) // actually handle the request
	o.Context.Respond(rw, r, route.Produces, route, res)

}