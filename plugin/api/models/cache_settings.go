// Code generated by go-swagger; DO NOT EDIT.

package models

// This file was generated by the swagger tool.
// Editing this file might prove futile when you re-run the swagger generate command

import (
	"context"

	"github.com/go-openapi/errors"
	"github.com/go-openapi/strfmt"
	"github.com/go-openapi/swag"
	"github.com/go-openapi/validate"
)

// CacheSettings cache settings
//
// swagger:model CacheSettings
type CacheSettings struct {

	// Directory to store the disk cache
	DiskCacheDir string `json:"diskCacheDir,omitempty"`

	// Whether caching is enabled
	// Required: true
	Enabled *bool `json:"enabled"`

	// Duration in seconds for file list cache
	FileListCacheDurationSeconds int32 `json:"fileListCacheDurationSeconds,omitempty"`

	// Maximum number of files stored in disk cache
	SiteDiskCacheMaxItems int32 `json:"siteDiskCacheMaxItems,omitempty"`

	// Maximum number of files stored in RAM cache
	SiteRAMCacheMaxItems int32 `json:"siteRamCacheMaxItems,omitempty"`
}

// Validate validates this cache settings
func (m *CacheSettings) Validate(formats strfmt.Registry) error {
	var res []error

	if err := m.validateEnabled(formats); err != nil {
		res = append(res, err)
	}

	if len(res) > 0 {
		return errors.CompositeValidationError(res...)
	}
	return nil
}

func (m *CacheSettings) validateEnabled(formats strfmt.Registry) error {

	if err := validate.Required("enabled", "body", m.Enabled); err != nil {
		return err
	}

	return nil
}

// ContextValidate validates this cache settings based on context it is used
func (m *CacheSettings) ContextValidate(ctx context.Context, formats strfmt.Registry) error {
	return nil
}

// MarshalBinary interface implementation
func (m *CacheSettings) MarshalBinary() ([]byte, error) {
	if m == nil {
		return nil, nil
	}
	return swag.WriteJSON(m)
}

// UnmarshalBinary interface implementation
func (m *CacheSettings) UnmarshalBinary(b []byte) error {
	var res CacheSettings
	if err := swag.ReadJSON(b, &res); err != nil {
		return err
	}
	*m = res
	return nil
}
