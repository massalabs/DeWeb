// Code generated by go-swagger; DO NOT EDIT.

package operations

// This file was generated by the swagger tool.
// Editing this file might prove futile when you re-run the swagger generate command

import (
	"net/http"

	"github.com/go-openapi/runtime"

	"github.com/massalabs/deweb-server/api/read/models"
)

// GetDeWebInfoOKCode is the HTTP code returned for type GetDeWebInfoOK
const GetDeWebInfoOKCode int = 200

/*
GetDeWebInfoOK Successful response

swagger:response getDeWebInfoOK
*/
type GetDeWebInfoOK struct {

	/*
	  In: Body
	*/
	Payload *models.DeWebInfo `json:"body,omitempty"`
}

// NewGetDeWebInfoOK creates GetDeWebInfoOK with default headers values
func NewGetDeWebInfoOK() *GetDeWebInfoOK {

	return &GetDeWebInfoOK{}
}

// WithPayload adds the payload to the get de web info o k response
func (o *GetDeWebInfoOK) WithPayload(payload *models.DeWebInfo) *GetDeWebInfoOK {
	o.Payload = payload
	return o
}

// SetPayload sets the payload to the get de web info o k response
func (o *GetDeWebInfoOK) SetPayload(payload *models.DeWebInfo) {
	o.Payload = payload
}

// WriteResponse to the client
func (o *GetDeWebInfoOK) WriteResponse(rw http.ResponseWriter, producer runtime.Producer) {

	rw.WriteHeader(200)
	if o.Payload != nil {
		payload := o.Payload
		if err := producer.Produce(rw, payload); err != nil {
			panic(err) // let the recovery middleware deal with this
		}
	}
}
