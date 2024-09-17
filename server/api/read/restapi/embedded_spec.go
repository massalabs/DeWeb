// Code generated by go-swagger; DO NOT EDIT.

package restapi

// This file was generated by the swagger tool.
// Editing this file might prove futile when you re-run the swagger generate command

import (
	"encoding/json"
)

var (
	// SwaggerJSON embedded version of the swagger document used at generation time
	SwaggerJSON json.RawMessage
	// FlatSwaggerJSON embedded flattened version of the swagger document used at generation time
	FlatSwaggerJSON json.RawMessage
)

func init() {
	SwaggerJSON = json.RawMessage([]byte(`{
  "schemes": [
    "http"
  ],
  "swagger": "2.0",
  "info": {
    "description": "DeWeb API used to browse decentralized websites",
    "title": "DeWeb Read API",
    "version": "0.1.0"
  },
  "paths": {
    "/": {
      "get": {
        "operationId": "defaultPage",
        "responses": {
          "200": {
            "description": "Shows the default page"
          }
        }
      }
    },
    "/{resource}": {
      "get": {
        "operationId": "getResource",
        "parameters": [
          {
            "type": "string",
            "name": "resource",
            "in": "path",
            "required": true
          }
        ],
        "responses": {
          "200": {
            "description": "Successful response"
          },
          "404": {
            "description": "Resource not found",
            "schema": {
              "$ref": "#/definitions/Error"
            }
          }
        }
      }
    }
  },
  "definitions": {
    "Error": {
      "type": "object",
      "properties": {
        "message": {
          "type": "string"
        }
      }
    }
  }
}`))
	FlatSwaggerJSON = json.RawMessage([]byte(`{
  "schemes": [
    "http"
  ],
  "swagger": "2.0",
  "info": {
    "description": "DeWeb API used to browse decentralized websites",
    "title": "DeWeb Read API",
    "version": "0.1.0"
  },
  "paths": {
    "/": {
      "get": {
        "operationId": "defaultPage",
        "responses": {
          "200": {
            "description": "Shows the default page"
          }
        }
      }
    },
    "/{resource}": {
      "get": {
        "operationId": "getResource",
        "parameters": [
          {
            "type": "string",
            "name": "resource",
            "in": "path",
            "required": true
          }
        ],
        "responses": {
          "200": {
            "description": "Successful response"
          },
          "404": {
            "description": "Resource not found",
            "schema": {
              "$ref": "#/definitions/Error"
            }
          }
        }
      }
    }
  },
  "definitions": {
    "Error": {
      "type": "object",
      "properties": {
        "message": {
          "type": "string"
        }
      }
    }
  }
}`))
}