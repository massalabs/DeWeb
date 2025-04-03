package config

import "github.com/massalabs/station/pkg/logger"

const (
	// Default cache size limits
	DefaultMaxRAMUsageMB       uint64 = 512                // Maximum RAM usage in MB, Default is 512MB
	DefaultMaxDiskUsageMB      uint64 = 4096               // Maximum disk usage in MB, Default is 4GB
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

func DefaultCacheConfig() CacheConfig {
	return CacheConfig{
		Enabled:                      true,
		SiteRAMCacheMaxItems:         DefaultMaxRAMUsageMB,
		SiteDiskCacheMaxItems:        DefaultMaxDiskUsageMB,
		DiskCacheDir:                 DefaultDiskCacheDir,
		FileListCacheDurationSeconds: DefaultFileListCachePeriod,
	}
}

// ConvertYamlCacheConfig converts a yamlCacheConfig to a CacheConfig
func ConvertYamlCacheConfig(yamlConf *YamlCacheConfig) CacheConfig {
	config := DefaultCacheConfig()

	if yamlConf == nil {
		logger.Debugf("ConvertYamlCacheConfig: yamlConf is nil, returning default config")
		return config
	}

	// Only override values that are explicitly set in the YAML
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

	return config
}
