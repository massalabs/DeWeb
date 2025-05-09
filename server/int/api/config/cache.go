package config

import (
	"path/filepath"

	"github.com/massalabs/station/pkg/logger"
)

const (
	// Default cache size limits
	DefaultMaxRAMItems         uint64 = 1000               // Maximum RAM items, Default is 1000
	DefaultMaxDiskItems        uint64 = 10000              // Maximum disk items, Default is 10000
	DefaultFileListCachePeriod        = 60                 // Default expiration of the file list cache in seconds
	DefaultDiskCacheDir               = "./websitesCache/" // Default cache directory
)

type CacheConfig struct {
	Enabled                      bool
	SiteRAMCacheMaxItems         uint64
	SiteDiskCacheMaxItems        uint64
	DiskCacheDir                 string
	FileListCacheDurationSeconds int
}

type YamlCacheConfig struct {
	Enabled                      *bool   `yaml:"enabled"`
	SiteRAMCacheMaxItems         *uint64 `yaml:"site_ram_cache_max_items"`
	SiteDiskCacheMaxItems        *uint64 `yaml:"site_disk_cache_max_items"`
	DiskCacheDir                 *string `yaml:"disk_cache_dir"`
	FileListCacheDurationSeconds *int    `yaml:"file_list_cache_duration_seconds"`
}

// DefaultCacheConfig returns a cache configuration with default values
func DefaultCacheConfig() CacheConfig {
	return CacheConfig{
		Enabled:                      true,
		SiteRAMCacheMaxItems:         DefaultMaxRAMItems,
		SiteDiskCacheMaxItems:        DefaultMaxDiskItems,
		DiskCacheDir:                 DefaultDiskCacheDir,
		FileListCacheDurationSeconds: DefaultFileListCachePeriod,
	}
}

// resolveCachePath resolves the cache path based on the configuration
// - If path is absolute, it's used as-is
// - If path is relative and from config file, it's resolved relative to the config file
func resolveCachePath(cachePath string, configPath string) string {
	if filepath.IsAbs(cachePath) {
		return cachePath
	}

	if configPath != "" {
		configDir := filepath.Dir(configPath)
		return filepath.Join(configDir, cachePath)
	}

	return cachePath
}

// ProcessCacheConfig processes YAML config into a ready-to-use CacheConfig
// It handles defaults, applies overrides from the YAML config, and resolves paths
func ProcessCacheConfig(yamlConf *YamlCacheConfig, configPath string) CacheConfig {
	config := DefaultCacheConfig()

	// Apply YAML configuration if provided
	if yamlConf != nil {
		applyYamlOverrides(&config, yamlConf)
	} else {
		logger.Debugf("ProcessCacheConfig: using default cache configuration")
	}

	// Resolve cache directory path
	config.DiskCacheDir = resolveCachePath(config.DiskCacheDir, configPath)

	return config
}

// applyYamlOverrides applies non-nil YAML settings to the cache config
func applyYamlOverrides(config *CacheConfig, yamlConf *YamlCacheConfig) {
	if yamlConf.Enabled != nil {
		config.Enabled = *yamlConf.Enabled
	}

	if yamlConf.SiteRAMCacheMaxItems != nil {
		config.SiteRAMCacheMaxItems = *yamlConf.SiteRAMCacheMaxItems
	}

	if yamlConf.SiteDiskCacheMaxItems != nil {
		config.SiteDiskCacheMaxItems = *yamlConf.SiteDiskCacheMaxItems
	}

	if yamlConf.DiskCacheDir != nil {
		config.DiskCacheDir = *yamlConf.DiskCacheDir
	}

	if yamlConf.FileListCacheDurationSeconds != nil {
		config.FileListCacheDurationSeconds = *yamlConf.FileListCacheDurationSeconds
	}
}
